// Syllabus Navigator API — get user progress per subject.
// Sprint 4-3.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  // Get subject-level aggregate progress.
  const { data: subjectProgress, error: spErr } = await admin
    .rpc('get_subject_progress', { p_user_id: user.id });

  if (spErr) {
    return NextResponse.json({ error: spErr.message }, { status: 500 });
  }

  // Get per-topic progress.
  const { data: topicProgress, error: tpErr } = await supabase
    .from('user_topic_progress')
    .select('id, topic_id, subject, mastery_level, quizzes_attempted, quizzes_passed, best_score_pct, last_activity_at')
    .eq('user_id', user.id)
    .order('subject');

  if (tpErr) {
    return NextResponse.json({ error: tpErr.message }, { status: 500 });
  }

  // Get topic titles from joins.
  const topicIds = (topicProgress || []).map((t: any) => t.topic_id);
  let topicTitles: Record<string, string> = {};
  if (topicIds.length > 0) {
    const { data: topics } = await admin
      .from('topics')
      .select('id, title')
      .in('id', topicIds);
    for (const t of (topics || [])) {
      topicTitles[t.id] = t.title;
    }
  }

  const topics = (topicProgress || []).map((t: any) => ({
    id: t.topic_id,
    title: topicTitles[t.topic_id] || t.topic_id?.slice(0, 8),
    subject: t.subject,
    masteryLevel: t.mastery_level,
    quizzesAttempted: t.quizzes_attempted,
    quizzesPassed: t.quizzes_passed,
    bestScorePct: t.best_score_pct,
    lastActivityAt: t.last_activity_at,
  }));

  return NextResponse.json({
    subjects: subjectProgress || [],
    topics,
  });
}
