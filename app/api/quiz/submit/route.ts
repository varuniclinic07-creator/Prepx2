import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { awardCoins } from '@/lib/coins';
import { aiChat, generateDiagnosis } from '@/lib/ai-router';

type Confidence = 'low' | 'mid' | 'high';

type IncomingAnswer = {
  questionId: string;
  selectedOption: number;
  timeSpentMs: number;
  confidence?: Confidence;
};

type WeakAreaRow = {
  topicId: string;
  errorType: 'silly' | 'concept' | 'time';
  errorReason: string;
  severity: number;
};

type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_option: string | number;
  explanation?: string;
  topic_id?: string;
};

const TIME_BUDGET_MS = 90_000; // 90s/question is the soft "time" threshold.

function severityFromSignals(timeSpentMs: number, confidence?: Confidence): number {
  // Severity 1 (mild) → 5 (severe). Confidence on a wrong answer = strong
  // concept gap. Time blow-out = strong time gap. We clamp to [1,5].
  let s = 3;
  if (confidence === 'high') s += 2; // wrong but confident → severe
  else if (confidence === 'mid') s += 1;
  else if (confidence === 'low') s -= 1;

  if (timeSpentMs > TIME_BUDGET_MS * 2) s += 1;
  else if (timeSpentMs < 5_000) s += 1; // panic-click

  if (s < 1) s = 1;
  if (s > 5) s = 5;
  return s;
}

function classifyLocally(timeSpentMs: number, confidence?: Confidence): 'silly' | 'concept' | 'time' {
  // Deterministic fallback used when the LLM classifier fails or is unavailable.
  if (timeSpentMs > TIME_BUDGET_MS * 1.5) return 'time';
  if (confidence === 'low') return 'concept';
  if (confidence === 'high' || timeSpentMs < 5_000) return 'silly';
  return 'concept';
}

async function classifyOne(opts: {
  question: string;
  selectedOption: number;
  correctOption: string | number;
  timeSpentMs: number;
  confidence?: Confidence;
}): Promise<{ gap: 'silly' | 'concept' | 'time'; reason: string }> {
  // Try the AI router for a more nuanced classification. Fall back to the
  // deterministic rule on any error (router cascades 5 tiers itself, so this
  // is a hard "all providers down" fallback).
  try {
    const raw = await aiChat({
      messages: [
        {
          role: 'system',
          content:
            'You classify UPSC quiz mistakes. Output strict JSON with keys "gap" (one of: silly, concept, time) and "reason" (max 12 words).',
        },
        {
          role: 'user',
          content: `Question: ${opts.question}\nUser picked option index: ${opts.selectedOption}\nCorrect option: ${opts.correctOption}\nTime spent: ${opts.timeSpentMs}ms\nSelf-rated confidence: ${opts.confidence ?? 'unknown'}\nReturn JSON: {"gap":"silly|concept|time","reason":"..."}`,
        },
      ],
      jsonMode: true,
      temperature: 0.2,
      maxTokens: 120,
    });
    const parsed = JSON.parse(raw);
    const gap = ['silly', 'concept', 'time'].includes(parsed.gap)
      ? (parsed.gap as 'silly' | 'concept' | 'time')
      : classifyLocally(opts.timeSpentMs, opts.confidence);
    const reason = typeof parsed.reason === 'string' && parsed.reason.length > 0
      ? parsed.reason.slice(0, 160)
      : 'auto-classified';
    return { gap, reason };
  } catch (err) {
    console.error('[quiz/submit] classifyOne fell back to local rule:', err);
    const gap = classifyLocally(opts.timeSpentMs, opts.confidence);
    return { gap, reason: 'local-rule classification (AI router unavailable)' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as
      | { quizId?: string; answers?: IncomingAnswer[] }
      | null;
    if (!body || typeof body.quizId !== 'string' || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { error: 'invalid body: expected { quizId, answers[] }' },
        { status: 400 },
      );
    }
    const { quizId, answers } = body;

    // Fetch the quiz (RLS allows authenticated reads via 099 policies).
    const { data: quizRow, error: quizErr } = await supabase
      .from('quizzes')
      .select('id, topic_id, questions')
      .eq('id', quizId)
      .single();

    if (quizErr || !quizRow) {
      return NextResponse.json({ error: `quiz not found: ${quizErr?.message ?? 'no row'}` }, { status: 404 });
    }

    const questions = (quizRow.questions ?? []) as QuizQuestion[];
    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'quiz has no questions' }, { status: 422 });
    }

    const quizTopicId = quizRow.topic_id as string | null;

    // Score the quiz. The legacy quizzes use string `correct_option` (e.g. "A");
    // newer ones use an integer index. Normalize both.
    const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const answerByQ = new Map<string, IncomingAnswer>();
    for (const a of answers) answerByQ.set(a.questionId, a);

    let correct = 0;
    const errorBreakdown: WeakAreaRow[] = [];
    const wrongForClassify: Array<{
      q: QuizQuestion;
      a: IncomingAnswer;
    }> = [];

    for (const q of questions) {
      const a = answerByQ.get(q.id);
      if (!a) continue;
      const correctOption = q.correct_option;
      let isCorrect: boolean;
      if (typeof correctOption === 'number') {
        isCorrect = a.selectedOption === correctOption;
      } else {
        const letter = optionLetters[a.selectedOption] ?? '';
        isCorrect = letter === correctOption;
      }
      if (isCorrect) correct++;
      else wrongForClassify.push({ q, a });
    }

    // Classify each wrong answer. Cap concurrency to keep router pressure sane.
    const classified: Array<{
      questionId: string;
      topicId: string;
      gap: 'silly' | 'concept' | 'time';
      reason: string;
      severity: number;
    }> = [];
    for (const { q, a } of wrongForClassify) {
      const { gap, reason } = await classifyOne({
        question: q.question,
        selectedOption: a.selectedOption,
        correctOption: q.correct_option,
        timeSpentMs: a.timeSpentMs,
        confidence: a.confidence,
      });
      const severity = severityFromSignals(a.timeSpentMs, a.confidence);
      const topicId = q.topic_id ?? quizTopicId;
      if (!topicId) continue; // can't attribute weakness without a topic
      classified.push({ questionId: q.id, topicId, gap, reason, severity });
      errorBreakdown.push({ topicId, errorType: gap, errorReason: reason, severity });
    }

    const score = correct;
    const total = questions.length;

    // Diagnosis text — pure LLM, fall back to short heuristic on failure.
    let diagnosis: string;
    try {
      const weakLabels = classified.map((c) => `${c.gap} on topic ${c.topicId.slice(0, 8)}`);
      diagnosis = await generateDiagnosis(weakLabels);
    } catch (err) {
      console.error('[quiz/submit] diagnosis generation failed:', err);
      diagnosis = correct === total
        ? 'Clean run — all correct. Move on to a harder topic.'
        : `Got ${correct}/${total}. Focus next 24h on the ${classified.length} flagged gap(s).`;
    }

    // ── Writes via service-role admin (touches RLS-protected tables) ──
    const admin = getAdminClient();

    // 1. Insert quiz_attempt.
    const { data: attempt, error: attemptErr } = await admin
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        score,
        max_score: total,
        response: { answers },
        answers: Object.fromEntries(answers.map((a) => [a.questionId, a.selectedOption])),
        error_breakdown: errorBreakdown,
        diagnosis,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (attemptErr || !attempt) {
      console.error('[quiz/submit] quiz_attempts insert failed:', attemptErr);
      return NextResponse.json(
        { error: `quiz_attempt insert failed: ${attemptErr?.message ?? 'unknown'}` },
        { status: 500 },
      );
    }

    const attemptId = attempt.id as string;

    // 2. Insert/upsert user_weak_areas. Dedupe per (user, topic, gap_type)
    // within 24h: bump severity instead of creating a new row.
    let weakAreasDetected = 0;
    if (classified.length > 0) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      for (const c of classified) {
        const { data: existing, error: existingErr } = await admin
          .from('user_weak_areas')
          .select('id, severity')
          .eq('user_id', user.id)
          .eq('topic_id', c.topicId)
          .eq('gap_type', c.gap)
          .gte('detected_at', oneDayAgo)
          .order('detected_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingErr) {
          console.error('[quiz/submit] weak_area lookup failed:', existingErr);
          return NextResponse.json(
            { error: `weak_area lookup failed: ${existingErr.message}` },
            { status: 500 },
          );
        }

        if (existing) {
          const bumped = Math.min(5, (existing.severity ?? 1) + 1);
          const { error: bumpErr } = await admin
            .from('user_weak_areas')
            .update({ severity: bumped, detected_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (bumpErr) {
            console.error('[quiz/submit] weak_area severity bump failed:', bumpErr);
            return NextResponse.json(
              { error: `weak_area bump failed: ${bumpErr.message}` },
              { status: 500 },
            );
          }
        } else {
          const { error: insErr } = await admin.from('user_weak_areas').insert({
            user_id: user.id,
            topic_id: c.topicId,
            gap_type: c.gap,
            severity: c.severity,
          });
          if (insErr) {
            // 23505 = unique_violation: same (user,topic,gap) already exists
            // outside the 24h lookback window. Bump that row instead.
            if (insErr.code === '23505') {
              const { data: pre } = await admin
                .from('user_weak_areas')
                .select('id, severity')
                .eq('user_id', user.id)
                .eq('topic_id', c.topicId)
                .eq('gap_type', c.gap)
                .single();
              if (pre) {
                await admin
                  .from('user_weak_areas')
                  .update({
                    severity: Math.min(5, (pre.severity ?? 1) + 1),
                    detected_at: new Date().toISOString(),
                    auto_injected_at: null,
                    expired_at: null,
                  })
                  .eq('id', pre.id);
              }
            } else {
              console.error('[quiz/submit] weak_area insert failed:', insErr);
              return NextResponse.json(
                { error: `weak_area insert failed: ${insErr.message}` },
                { status: 500 },
              );
            }
          }
          weakAreasDetected++;
        }
      }
    }

    // 3. Award coins (5 per correct, idempotent on attempt id).
    const coinsEarned = correct * 5;
    if (coinsEarned > 0) {
      await awardCoins(
        admin,
        user.id,
        coinsEarned,
        'quiz_correct',
        `quiz_attempt_${attemptId}_completion`,
      );
    }

    return NextResponse.json({
      score,
      total,
      coinsEarned,
      weakAreasDetected,
      diagnosis,
      attemptId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[quiz/submit] unhandled error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
