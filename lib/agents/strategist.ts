// Chanakya — the AI Strategist agent. Reads the user's last 30d quiz/mains/
// weak-area trail and emits a structured diagnose row that the dashboard card
// renders. Cached in `study_recommendations` so the dashboard doesn't burn
// LLM calls on every render.

import { aiChat } from '../ai-router';
import { getAdminClient } from '../supabase-admin';

export interface ActionStep {
  title: string;
  detail: string;
  href?: string;
}

export interface StrategistDiagnose {
  headline: string;
  diagnosis: string;
  action_steps: ActionStep[];
  focus_subjects: string[];
  confidence: number; // 0..1
}

const SYSTEM_PROMPT = `You are Chanakya, a UPSC CSE strategy mentor with 20 years of mains evaluation experience. You receive a JSON snapshot of one aspirant's last 30 days of activity (quiz attempts, mains evaluations, weak areas). Return ONLY valid JSON with this exact shape:

{
  "headline": "One-line punch in active voice. <=80 chars. e.g. 'Polity careless errors are bleeding 8-10 marks per paper.'",
  "diagnosis": "2-3 sentences naming the specific pattern, the cost, and the cause. Cite numbers from the data. <=320 chars.",
  "action_steps": [
    {"title": "Concrete next action 1", "detail": "Why this and how to execute. <=140 chars.", "href": "/optional/path"},
    {"title": "Concrete next action 2", "detail": "..."},
    {"title": "Concrete next action 3", "detail": "..."}
  ],
  "focus_subjects": ["polity", "economy"],
  "confidence": 0.78
}

Rules:
- Reference real numbers from the input (avg score, count of weak-areas, dimension averages from mains).
- If the user has no quiz history, headline must be a positive onboarding nudge ("Take your first quiz to unlock pattern analysis"). Confidence then = 0.2.
- Action steps must be specific. NO vague advice like "practice more". Always name a topic or behaviour.
- focus_subjects: lowercase subject slugs (polity, economy, history, geography, environment, science_tech, ethics, csat).
- confidence: 0.2 if <5 quizzes, up to 0.9 if 20+ quizzes + 5+ mains attempts.`;

interface DiagnoseInput {
  quiz_count: number;
  quiz_avg_pct: number;
  quiz_recent_pcts: number[];
  weak_areas: { topic_title: string; gap_type: string; severity: number }[];
  mains_count: number;
  mains_avg_dims: { structure: number; content: number; analysis: number; presentation: number } | null;
  baseline_score: number | null;
  streak: number;
}

export async function diagnoseUser(userId: string): Promise<StrategistDiagnose> {
  const sb = getAdminClient();
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [quizRes, weakRes, mainsRes, profileRes] = await Promise.all([
    sb
      .from('quiz_attempts')
      .select('score, max_score, completed_at')
      .eq('user_id', userId)
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: false })
      .limit(30),
    sb
      .from('user_weak_areas')
      .select('gap_type, severity, topics(title)')
      .eq('user_id', userId)
      .order('severity', { ascending: false })
      .limit(8),
    sb
      .from('answer_evaluations')
      .select('structure_score, content_score, analysis_score, presentation_score, created_at')
      .eq('user_id', userId)
      .gte('created_at', sinceIso),
    sb
      .from('users')
      .select('baseline_score, streak_count')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  const quizzes = (quizRes.data ?? []) as { score: number; max_score: number; completed_at: string }[];
  const quiz_count = quizzes.length;
  const pcts = quizzes.map((q) => (q.max_score > 0 ? (q.score / q.max_score) * 100 : 0));
  const quiz_avg_pct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  const quiz_recent_pcts = pcts.slice(0, 7).map((p) => Math.round(p));

  const weak_rows = (weakRes.data ?? []) as Record<string, unknown>[];
  const weak_areas = weak_rows.map((row) => {
    const topicsField = row.topics as { title?: string } | { title?: string }[] | null;
    const t = Array.isArray(topicsField) ? topicsField[0] : topicsField;
    return {
      topic_title: t?.title ?? 'unknown topic',
      gap_type: String(row.gap_type ?? 'concept'),
      severity: Number(row.severity ?? 1),
    };
  });

  const mains = (mainsRes.data ?? []) as { structure_score: number; content_score: number; analysis_score: number; presentation_score: number }[];
  const mains_count = mains.length;
  const mains_avg_dims = mains_count > 0
    ? {
        structure: round1(mains.reduce((a, m) => a + m.structure_score, 0) / mains_count),
        content: round1(mains.reduce((a, m) => a + m.content_score, 0) / mains_count),
        analysis: round1(mains.reduce((a, m) => a + m.analysis_score, 0) / mains_count),
        presentation: round1(mains.reduce((a, m) => a + m.presentation_score, 0) / mains_count),
      }
    : null;

  const profile = profileRes.data;
  const input: DiagnoseInput = {
    quiz_count,
    quiz_avg_pct,
    quiz_recent_pcts,
    weak_areas,
    mains_count,
    mains_avg_dims,
    baseline_score: profile?.baseline_score ?? null,
    streak: profile?.streak_count ?? 0,
  };

  // No history at all → return a deterministic onboarding nudge without burning tokens.
  if (quiz_count === 0 && mains_count === 0) {
    return {
      headline: 'Take your first quiz — Chanakya cannot diagnose without a footprint.',
      diagnosis: 'No quiz attempts and no mains submissions in the last 30 days. Start with one daily-plan quiz so the strategist can spot the pattern that\'s costing you marks.',
      action_steps: [
        { title: 'Open today\'s daily plan', detail: 'Hermes already queued a calibration quiz for you.', href: '/dashboard' },
        { title: 'Write one mains answer', detail: '250 words on any GS topic; the evaluator scores 4 dimensions.', href: '/mains' },
        { title: 'Set a 7-day streak target', detail: 'Even 1 task/day for a week unlocks the pattern detector.', href: '/dashboard' },
      ],
      focus_subjects: [],
      confidence: 0.2,
    };
  }

  let parsed: StrategistDiagnose;
  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(input) },
      ],
      temperature: 0.3,
      maxTokens: 700,
      jsonMode: true,
    });
    parsed = normalize(JSON.parse(raw));
  } catch {
    // Heuristic fallback so the dashboard never shows an error card.
    parsed = heuristic(input);
  }
  return parsed;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function normalize(raw: unknown): StrategistDiagnose {
  const r = (raw ?? {}) as Record<string, unknown>;
  const headline = typeof r.headline === 'string' ? r.headline.slice(0, 200) : 'Insufficient signal — keep practising.';
  const diagnosis = typeof r.diagnosis === 'string' ? r.diagnosis.slice(0, 600) : '';
  const stepsRaw = Array.isArray(r.action_steps) ? (r.action_steps as Record<string, unknown>[]) : [];
  const action_steps: ActionStep[] = stepsRaw.slice(0, 5).map((s) => ({
    title: typeof s.title === 'string' ? s.title.slice(0, 120) : '',
    detail: typeof s.detail === 'string' ? s.detail.slice(0, 240) : '',
    href: typeof s.href === 'string' ? s.href : undefined,
  })).filter((s) => s.title);
  const focus_subjects = Array.isArray(r.focus_subjects)
    ? (r.focus_subjects as unknown[]).map((x) => String(x).toLowerCase()).slice(0, 4)
    : [];
  const confRaw = typeof r.confidence === 'number' ? r.confidence : 0.5;
  const confidence = Math.min(0.95, Math.max(0.1, confRaw));
  return { headline, diagnosis, action_steps, focus_subjects, confidence };
}

function heuristic(input: DiagnoseInput): StrategistDiagnose {
  const weakest = input.weak_areas[0];
  const dims = input.mains_avg_dims;
  let weakestDim: string | null = null;
  let weakestVal = 11;
  if (dims) {
    for (const [k, v] of Object.entries(dims)) {
      if (v < weakestVal) { weakestVal = v; weakestDim = k; }
    }
  }
  const headline = weakest
    ? `${weakest.topic_title} (${weakest.gap_type}) is your top leak.`
    : weakestDim
      ? `Mains ${weakestDim} averaging ${weakestVal}/10 — fix this first.`
      : `${input.quiz_count} quizzes in 30d, avg ${input.quiz_avg_pct}%. Push for >70%.`;
  const diagnosis = `Avg quiz score ${input.quiz_avg_pct}% across ${input.quiz_count} attempts. ${input.weak_areas.length} active weak areas. Mains: ${input.mains_count} attempts${dims ? ` (avg dims S${dims.structure}/C${dims.content}/A${dims.analysis}/P${dims.presentation})` : ''}.`;
  const steps: ActionStep[] = [];
  if (weakest) steps.push({ title: `Drill ${weakest.topic_title}`, detail: `Severity ${weakest.severity}/5 — Hermes already injected this into today's plan.`, href: '/dashboard' });
  if (weakestDim) steps.push({ title: `Practise mains ${weakestDim}`, detail: `Lowest dimension at ${weakestVal}/10. Write 2 answers focused on that lens.`, href: '/mains' });
  if (input.quiz_count < 5) steps.push({ title: 'Run more quizzes', detail: 'Need ≥5 attempts/week for trend detection.', href: '/dashboard' });
  if (steps.length === 0) steps.push({ title: 'Stay consistent', detail: 'Pattern is healthy; one daily quiz keeps the streak alive.', href: '/dashboard' });
  return {
    headline,
    diagnosis,
    action_steps: steps.slice(0, 3),
    focus_subjects: weakest ? [weakest.topic_title.toLowerCase().split(' ')[0]] : [],
    confidence: input.quiz_count >= 20 ? 0.7 : input.quiz_count >= 5 ? 0.45 : 0.25,
  };
}
