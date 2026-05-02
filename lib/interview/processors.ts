import 'server-only';
import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { aiChat } from '../ai-router';
import { parseSceneSpec, type SceneSpec } from '../3d/scene-spec';

// Sprint 3 / S3-8 — Live Interview Panel.
//
// Two phases dispatched via the `phase` field in the BullMQ payload:
//   panel-question  → generate next round of 3 questions (one per judge),
//                     persist as interview_turns rows with empty answers.
//   debrief-render  → score every answered turn, then render a holistic
//                     debrief (summary + strengths + weaknesses + 3D scene).

type Judge = 'chairperson' | 'expert' | 'behavioural';
const JUDGES: Judge[] = ['chairperson', 'expert', 'behavioural'];

const JUDGE_PERSONAS: Record<Judge, { name: string; system: string }> = {
  chairperson: {
    name: 'Chairperson',
    system: [
      'You are the Chairperson of a UPSC Civil Services interview board.',
      'Your tone is calm, broad, and probing — you test poise, worldview, and clarity of thinking.',
      'You ask wide-aperture questions: motivations, current affairs, the candidate\'s biodata, value conflicts.',
      'Never repeat or paraphrase questions already asked. Keep questions concise (max 30 words).',
    ].join(' '),
  },
  expert: {
    name: 'Subject Expert',
    system: [
      'You are the Subject Expert on a UPSC interview board.',
      'You probe technical depth on the candidate\'s declared topic focus and the UPSC syllabus.',
      'Ask precise factual or analytical questions that reveal whether the candidate truly understands the topic.',
      'Never repeat or paraphrase questions already asked. Keep questions concise (max 35 words).',
    ].join(' '),
  },
  behavioural: {
    name: 'Behavioural Psychologist',
    system: [
      'You are the Behavioural Psychologist on a UPSC interview board.',
      'You probe ethics, decision-making, integrity, and emotional resilience through situational prompts.',
      'Ask one realistic ethical-dilemma or self-reflection question. Avoid syllabus trivia.',
      'Never repeat or paraphrase questions already asked. Keep questions concise (max 35 words).',
    ].join(' '),
  },
};

interface TurnRow {
  id: string;
  turn_index: number;
  judge: Judge;
  question: string;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
}

function parseJsonLoose<T>(raw: string, fallback: T): T {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(trimmed) as T; } catch { /* fall through */ }
  const m = trimmed.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]) as T; } catch { /* fall through */ }
  }
  return fallback;
}

function fallbackSceneSpec(totalScore: number): SceneSpec {
  // Used only when the LLM emits malformed scene_spec; debrief still ships.
  const tier: any = totalScore >= 22 ? 'success' : totalScore >= 15 ? 'gold' : 'warning';
  return {
    version: 1,
    background: 'primary',
    durationSeconds: 12,
    ambientIntensity: 0.6,
    meshes: [
      { kind: 'sphere',      position: [-2.2, 0.5, 0], color: 'cyan',    emissive: true, label: 'Chairperson' },
      { kind: 'icosahedron', position: [ 0,   0.5, 0], color: tier,      emissive: true, label: 'Expert' },
      { kind: 'torus',       position: [ 2.2, 0.5, 0], color: 'magenta', emissive: true, label: 'Behavioural' },
      { kind: 'plane',       position: [0, -0.6, 0], rotation: [-Math.PI / 2, 0, 0], scale: [10, 10, 1], color: 'muted' },
    ],
    cameraKeyframes: [
      { timeSeconds: 0,  position: [0, 1.2, 6], lookAt: [0, 0.5, 0] },
      { timeSeconds: 6,  position: [3, 1.5, 4], lookAt: [0, 0.5, 0] },
      { timeSeconds: 12, position: [-3, 1.5, 4], lookAt: [0, 0.5, 0] },
    ],
    labels: [
      { timeSeconds: 1, position: [0, 2, 0], text: `Total: ${totalScore}/30`, durationSeconds: 4, size: 0.5 },
      { timeSeconds: 6, position: [0, 2, 0], text: 'Debrief',                durationSeconds: 4, size: 0.5 },
    ],
  };
}

async function generateQuestionForJudge(
  judge: Judge,
  topicFocus: string | null,
  priorQuestions: string[],
  turnIndex: number,
): Promise<string> {
  const persona = JUDGE_PERSONAS[judge];
  const prior = priorQuestions.length > 0
    ? `Already-asked questions in this interview (do not repeat or paraphrase):\n- ${priorQuestions.join('\n- ')}`
    : 'No questions have been asked yet.';
  const focusLine = topicFocus
    ? `Candidate's declared topic focus: ${topicFocus}.`
    : 'No declared topic focus — keep your question general.';

  const userMsg = [
    focusLine,
    `This is turn ${turnIndex} of the interview.`,
    prior,
    'Reply with ONLY a single JSON object: {"question": "..."}.',
    'No preamble, no markdown, no commentary.',
  ].join('\n\n');

  const raw = await aiChat({
    messages: [
      { role: 'system', content: persona.system },
      { role: 'user',   content: userMsg },
    ],
    temperature: 0.6,
    maxTokens: 220,
    jsonMode: true,
  });

  const parsed = parseJsonLoose<{ question?: string }>(raw, {});
  const q = (parsed.question || '').trim();
  if (q.length > 8) return q;

  if (judge === 'chairperson') return `Tell us, in two minutes, why you want to join the civil services${topicFocus ? ` given your interest in ${topicFocus}` : ''}.`;
  if (judge === 'expert')      return `Explain one major recent development${topicFocus ? ` in ${topicFocus}` : ' in your optional subject'} and its implications.`;
  return 'Describe a situation where your sense of integrity was tested. What did you do, and what did you learn?';
}

async function scoreAnswer(
  judge: Judge,
  question: string,
  answer: string,
  topicFocus: string | null,
): Promise<{ score: number; feedback: string }> {
  const persona = JUDGE_PERSONAS[judge];
  const userMsg = [
    `Question you asked: ${question}`,
    `Candidate's answer: ${answer}`,
    topicFocus ? `Topic focus: ${topicFocus}.` : '',
    'Score the answer 0-10 from your judge\'s lens (chairperson=poise/clarity, expert=technical accuracy/depth, behavioural=ethical reasoning/self-awareness).',
    'Reply with ONLY: {"score": <integer 0-10>, "feedback": "<2-3 sentence specific feedback>"}.',
  ].filter(Boolean).join('\n\n');

  const raw = await aiChat({
    messages: [
      { role: 'system', content: persona.system + ' You are now evaluating an answer.' },
      { role: 'user',   content: userMsg },
    ],
    temperature: 0.3,
    maxTokens: 400,
    jsonMode: true,
  });

  const parsed = parseJsonLoose<{ score?: number; feedback?: string }>(raw, {});
  const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score ?? 5))));
  const feedback = (parsed.feedback || 'Answer noted.').toString().slice(0, 2000);
  return { score, feedback };
}

async function generateDebrief(
  topicFocus: string | null,
  turns: TurnRow[],
  totalScore: number,
): Promise<{ summary: string; strengths: string[]; weaknesses: string[]; sceneSpec: SceneSpec }> {
  const transcript = turns
    .map(t => `[${t.judge.toUpperCase()} | turn ${t.turn_index} | score ${t.score ?? '?'}/10]\nQ: ${t.question}\nA: ${t.user_answer}\nFeedback: ${t.feedback ?? ''}`)
    .join('\n\n');

  const sceneInstructions = [
    'sceneSpec is a JSON object with this shape:',
    '{',
    '  "version": 1,',
    '  "background": "primary"|"muted"|"cyan"|"saffron"|"success"|"warning"|"magenta"|"gold",',
    '  "durationSeconds": 10-15,',
    '  "ambientIntensity": 0.4-0.8,',
    '  "meshes": [ { "kind": "sphere"|"box"|"torus"|"cone"|"plane"|"icosahedron", "position": [x,y,z], "scale"?: number|[x,y,z], "rotation"?: [x,y,z], "color": "<color>", "emissive"?: bool, "label"?: "<string>" } ],',
    '  "cameraKeyframes": [ { "timeSeconds": <0..durationSeconds>, "position": [x,y,z], "lookAt": [x,y,z] } ],',
    '  "labels": [ { "timeSeconds": <0..durationSeconds>, "position": [x,y,z], "text": "<short>", "durationSeconds"?: number, "size"?: number } ]',
    '}',
    'Use 3-6 meshes (one per judge plus optional ground), 3+ camera keyframes, 2-4 labels. Place candidate at origin, judges arc around.',
  ].join('\n');

  const userMsg = [
    'You are the post-interview debrief author.',
    topicFocus ? `Topic focus: ${topicFocus}.` : 'No declared topic focus.',
    `Total score: ${totalScore} / ${turns.length * 10}.`,
    'Transcript:',
    transcript,
    '',
    'Return ONLY a JSON object:',
    '{',
    '  "summary": "<3-4 sentence overall verdict>",',
    '  "strengths": ["<bullet>", "<bullet>", "<bullet>"],',
    '  "weaknesses": ["<bullet>", "<bullet>", "<bullet>"],',
    '  "sceneSpec": <SceneSpec JSON>',
    '}',
    '',
    sceneInstructions,
  ].join('\n');

  const raw = await aiChat({
    messages: [
      { role: 'system', content: 'You are an honest UPSC interview coach producing a structured debrief.' },
      { role: 'user',   content: userMsg },
    ],
    temperature: 0.4,
    maxTokens: 2200,
    jsonMode: true,
  });

  const parsed = parseJsonLoose<{
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    sceneSpec?: unknown;
  }>(raw, {});

  const summary = (parsed.summary || 'Interview complete. Review per-turn feedback for specifics.').toString();
  const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 6) : [];
  const weaknesses = Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String).slice(0, 6) : [];

  let sceneSpec = parseSceneSpec(parsed.sceneSpec);
  if (!sceneSpec) sceneSpec = fallbackSceneSpec(totalScore);

  return { summary, strengths, weaknesses, sceneSpec };
}

async function processPanelQuestion(
  sb: ReturnType<typeof getAdminClient>,
  sessionId: string,
  taskId: string,
): Promise<Record<string, any>> {
  const { data: session, error: sErr } = await sb
    .from('interview_sessions')
    .select('id, topic_focus, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr || !session) throw new Error(`interview session not found: ${sErr?.message || sessionId}`);
  if (session.status !== 'in_progress') {
    return { taskId, sessionId, skipped: true, reason: `status=${session.status}` };
  }

  const { data: priorRows, error: pErr } = await sb
    .from('interview_turns')
    .select('turn_index, judge, question')
    .eq('session_id', sessionId)
    .order('turn_index', { ascending: true });
  if (pErr) throw new Error(`fetch turns: ${pErr.message}`);

  const prior = (priorRows || []) as Array<{ turn_index: number; judge: Judge; question: string }>;
  const nextTurnIndex = (prior.reduce((m, r) => Math.max(m, r.turn_index), 0)) + 1;
  const priorQuestions = prior.map(r => r.question);

  const generated = await Promise.all(
    JUDGES.map(j => generateQuestionForJudge(j, session.topic_focus ?? null, priorQuestions, nextTurnIndex)),
  );

  const rows = JUDGES.map((judge, i) => ({
    session_id: sessionId,
    turn_index: nextTurnIndex,
    judge,
    question: generated[i],
  }));

  const { error: insErr } = await sb.from('interview_turns').insert(rows);
  if (insErr) throw new Error(`insert turns: ${insErr.message}`);

  return {
    taskId,
    sessionId,
    turnIndex: nextTurnIndex,
    questions: rows.map(r => ({ judge: r.judge, question: r.question })),
  };
}

async function processDebriefRender(
  sb: ReturnType<typeof getAdminClient>,
  sessionId: string,
  taskId: string,
): Promise<Record<string, any>> {
  const { data: session, error: sErr } = await sb
    .from('interview_sessions')
    .select('id, topic_focus, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr || !session) throw new Error(`interview session not found: ${sErr?.message || sessionId}`);

  const { data: turnRows, error: tErr } = await sb
    .from('interview_turns')
    .select('id, turn_index, judge, question, user_answer, score, feedback')
    .eq('session_id', sessionId)
    .order('turn_index', { ascending: true });
  if (tErr) throw new Error(`fetch turns: ${tErr.message}`);
  const turns = (turnRows || []) as TurnRow[];
  const answered = turns.filter(t => t.user_answer && t.user_answer.trim().length > 0);
  if (answered.length === 0) {
    await sb.from('interview_sessions').update({
      status: 'abandoned',
      ended_at: new Date().toISOString(),
    }).eq('id', sessionId);
    return { taskId, sessionId, abandoned: true, reason: 'no_answers' };
  }

  for (const t of answered) {
    if (t.score !== null) continue;
    const { score, feedback } = await scoreAnswer(t.judge, t.question, t.user_answer!, session.topic_focus ?? null);
    const { error: upErr } = await sb
      .from('interview_turns')
      .update({ score, feedback })
      .eq('id', t.id);
    if (upErr) throw new Error(`update turn ${t.id}: ${upErr.message}`);
    t.score = score;
    t.feedback = feedback;
  }

  const totalScore = answered.reduce((s, t) => s + (t.score ?? 0), 0);

  const { summary, strengths, weaknesses, sceneSpec } = await generateDebrief(
    session.topic_focus ?? null,
    answered,
    totalScore,
  );

  const { data: existing } = await sb
    .from('interview_debriefs')
    .select('id')
    .eq('session_id', sessionId)
    .maybeSingle();

  let debriefId: string;
  if (existing) {
    const { error: upErr } = await sb
      .from('interview_debriefs')
      .update({
        summary, strengths, weaknesses,
        scene_spec: sceneSpec,
        render_status: 'r3f_only',
      })
      .eq('id', existing.id);
    if (upErr) throw new Error(`update debrief: ${upErr.message}`);
    debriefId = existing.id as string;
  } else {
    const { data: ins, error: insErr } = await sb
      .from('interview_debriefs')
      .insert({
        session_id: sessionId,
        summary, strengths, weaknesses,
        scene_spec: sceneSpec,
        render_status: 'r3f_only',
      })
      .select('id')
      .single();
    if (insErr || !ins?.id) throw new Error(`insert debrief: ${insErr?.message || 'no id'}`);
    debriefId = ins.id as string;
  }

  const { error: sessErr } = await sb
    .from('interview_sessions')
    .update({
      status: 'debriefed',
      total_score: totalScore,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);
  if (sessErr) throw new Error(`update session: ${sessErr.message}`);

  return { taskId, sessionId, debriefId, totalScore };
}

export async function processInterviewJob(job: Job, taskId: string): Promise<Record<string, any>> {
  const sessionId: string | undefined = job.data?.sessionId;
  const phase: 'panel-question' | 'debrief-render' | undefined = job.data?.phase;
  if (!sessionId) throw new Error('interview job missing sessionId');
  if (phase !== 'panel-question' && phase !== 'debrief-render') {
    throw new Error(`interview job invalid phase: ${phase}`);
  }

  const sb = getAdminClient();
  if (phase === 'panel-question') return processPanelQuestion(sb, sessionId, taskId);
  return processDebriefRender(sb, sessionId, taskId);
}
