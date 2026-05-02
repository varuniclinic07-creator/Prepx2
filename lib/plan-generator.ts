import { supabase } from './supabase';
import { getAdminClient } from './supabase-admin';
import { QuizTask } from '../types';

const MAX_TASKS_PER_PLAN = 5;

type InjectedWeakArea = {
  topic_id: string;
  gap_type: 'silly' | 'concept' | 'time' | string;
  severity: number | null;
};

/**
 * Generate today's daily plan for a user.
 *
 * Weak-area handling: rather than reading user_weak_areas directly, we ask the
 * `inject_weak_areas_for_plan` RPC to (a) pick the top-3 highest-severity weak
 * areas detected in the last 72h, and (b) atomically stamp auto_injected_at so
 * those rows are never re-picked. We also call `expire_stale_weak_areas()`
 * once per generation to garbage-collect rows that aged past the window
 * without ever being injected.
 *
 * We use the service-role admin client because both RPCs are SECURITY DEFINER
 * and the planner runs in trusted server contexts (server components, the
 * Hermes worker, the daily-plan API route).
 */
export async function generateDailyPlan(userId: string): Promise<QuizTask[]> {
  const today = new Date().toISOString().split('T')[0];

  let admin;
  try {
    admin = getAdminClient();
  } catch {
    admin = null;
  }

  // Best-effort housekeeping. Never fails the plan if the RPC errors —
  // the picker still returns the right rows even without expiry stamping.
  if (admin) {
    try {
      await admin.rpc('expire_stale_weak_areas');
    } catch (err) {
      console.error('[plan-generator] expire_stale_weak_areas failed:', err);
    }
  }

  // Fetch auto-injected weak areas (top-3, sorted by severity desc).
  let weakAreasInjected: InjectedWeakArea[] = [];
  if (admin) {
    const { data, error } = await admin.rpc('inject_weak_areas_for_plan', {
      p_user_id: userId,
      p_plan_date: today,
    });
    if (error) {
      console.error('[plan-generator] inject_weak_areas_for_plan failed:', error.message);
    } else {
      weakAreasInjected = (data ?? []) as InjectedWeakArea[];
    }
  }

  // Attempted topics — used to filter "new" vs already-seen candidates.
  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('quiz_id')
    .eq('user_id', userId);

  let attemptedTopicIds: string[] = [];
  if (attempts && attempts.length > 0) {
    const quizIds = attempts.map((a) => a.quiz_id);
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('topic_id')
      .in('id', quizIds);
    attemptedTopicIds = (quizzes || []).map((q) => q.topic_id);
  }

  const { data: allTopics } = await supabase
    .from('topics')
    .select('id, subject')
    .order('created_at', { ascending: true })
    .limit(50);

  const newTopics = (allTopics || [])
    .filter((t) => !attemptedTopicIds.includes(t.id))
    .slice(0, 2);

  const tasks: QuizTask[] = [];

  // 1. Review tasks for auto-injected weak areas (already severity-sorted).
  for (const weak of weakAreasInjected) {
    if (tasks.length >= MAX_TASKS_PER_PLAN) break;
    if (!weak.topic_id) continue;
    tasks.push({
      topic_id: weak.topic_id,
      type: 'review',
      duration: 15,
      status: 'pending',
    });
  }

  // 2. Read tasks for new topics, capped by remaining task budget.
  for (const t of newTopics) {
    if (tasks.length >= MAX_TASKS_PER_PLAN - 1) break; // leave room for at least 1 quiz
    tasks.push({ topic_id: t.id, type: 'read', duration: 20, status: 'pending' });
  }

  // 3. Always include exactly one quiz task to close the loop.
  if (tasks.length < MAX_TASKS_PER_PLAN) {
    const quizCandidate =
      newTopics[0]?.id ??
      weakAreasInjected[0]?.topic_id ??
      (allTopics || []).find((t) => !tasks.some((task) => task.topic_id === t.id))?.id ??
      (allTopics || [])[0]?.id;
    if (quizCandidate) {
      tasks.push({
        topic_id: quizCandidate,
        type: 'quiz',
        duration: 10,
        status: 'pending',
      });
    }
  }

  // 4. Floor at 3 tasks: if the user has nothing attempted and no weak areas,
  // pad with a fallback read+quiz so the dashboard isn't empty.
  if (tasks.length < 3) {
    const fallback = (allTopics || []).find(
      (t) => !tasks.some((task) => task.topic_id === t.id),
    );
    if (fallback) {
      if (tasks.length < MAX_TASKS_PER_PLAN) {
        tasks.push({
          topic_id: fallback.id,
          type: 'read',
          duration: 20,
          status: 'pending',
        });
      }
      if (tasks.length < MAX_TASKS_PER_PLAN) {
        tasks.push({
          topic_id: fallback.id,
          type: 'quiz',
          duration: 10,
          status: 'pending',
        });
      }
    }
  }

  // 5. CA bundle injection (Sprint 2 Epic 5.3). If today has a published
  //    bundle and the user hasn't marked it fully read, slot one task in.
  //    We do this LAST so it only consumes spare budget and never displaces
  //    a quiz/review task. If we're already at MAX, we drop a 'read' task
  //    in favour of the CA bundle (current affairs is daily-fresh; missing
  //    a bundle is a bigger learning gap than missing one read).
  if (admin) {
    try {
      const { data: bundle } = await admin
        .from('ca_daily_bundles')
        .select('id, status')
        .eq('bundle_date', today)
        .eq('status', 'published')
        .maybeSingle();

      if (bundle?.id) {
        const { data: wholeRead } = await admin
          .from('ca_bundle_reads')
          .select('id')
          .eq('user_id', userId)
          .eq('bundle_id', bundle.id)
          .is('article_id', null)
          .maybeSingle();

        if (!wholeRead) {
          const bundleTask: QuizTask = {
            topic_id: null,
            type: 'ca_bundle',
            bundle_id: bundle.id,
            duration: 10,
            status: 'pending',
          };
          if (tasks.length >= MAX_TASKS_PER_PLAN) {
            // Replace the last 'read' if present, otherwise the last task.
            const lastReadIdx = (() => {
              for (let i = tasks.length - 1; i >= 0; i--) {
                if (tasks[i].type === 'read') return i;
              }
              return tasks.length - 1;
            })();
            tasks.splice(lastReadIdx, 1, bundleTask);
          } else {
            tasks.push(bundleTask);
          }
        }
      }
    } catch (err) {
      console.error('[plan-generator] ca_bundle injection failed:', err);
    }
  }

  return tasks.slice(0, MAX_TASKS_PER_PLAN);
}
