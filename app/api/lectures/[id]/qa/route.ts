// GET  /api/lectures/[id]/qa → list current user's Q&A entries on this lecture
// POST /api/lectures/[id]/qa → { time_seconds, question }
//   Generates an AI answer grounded in the lecture's script_text, persists Q+A row.
//
// We deliberately answer synchronously (no queue) because UPSC learners ask one
// question and want a reply now — the AI router already cascades through 5 tiers
// and circuit-breaks if all are down.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { aiChat } from '@/lib/ai-router';

const QA_SYSTEM = `You are a UPSC CSE tutor answering a student question about a recorded lecture.
Rules:
- Ground every claim in the provided lecture script. Quote phrases when relevant.
- If the lecture does not cover the question, say so explicitly and give the closest relevant fact.
- Be concise: 4-8 sentences. Avoid filler.
- End with one sentence pointing to the timestamp range (in mm:ss) where the topic was covered, if any.`;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: lectureId } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await sb
    .from('video_qa')
    .select('id, time_seconds, question, answer, source_chunks, created_at')
    .eq('lecture_id', lectureId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: lectureId } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const time_seconds = Number(body?.time_seconds) || 0;
  const question: string = String(body?.question ?? '').trim();
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  if (question.length > 1000) return NextResponse.json({ error: 'question too long' }, { status: 400 });

  // Pull the lecture script via admin client (RLS on video_scripts is admin-only,
  // but we need it to ground the answer for any logged-in viewer).
  const admin = getAdminClient();
  const { data: lecture } = await admin
    .from('video_lectures')
    .select('id, title, script_id, status')
    .eq('id', lectureId)
    .maybeSingle();
  if (!lecture || lecture.status !== 'published') {
    return NextResponse.json({ error: 'lecture not available' }, { status: 404 });
  }
  const { data: script } = await admin
    .from('video_scripts')
    .select('script_text, source_citations, language')
    .eq('id', lecture.script_id)
    .maybeSingle();
  if (!script?.script_text) {
    return NextResponse.json({ error: 'script not found' }, { status: 404 });
  }

  // Trim very long scripts to stay inside provider context windows.
  const grounded = script.script_text.length > 12000
    ? script.script_text.slice(0, 12000) + '\n\n[...script truncated...]'
    : script.script_text;

  let answer = '';
  try {
    answer = await aiChat({
      messages: [
        { role: 'system', content: QA_SYSTEM },
        { role: 'user', content:
          `LECTURE TITLE: ${lecture.title}\nLANGUAGE: ${script.language ?? 'en'}\n\n` +
          `LECTURE SCRIPT:\n${grounded}\n\n` +
          `STUDENT TIMESTAMP: ${Math.floor(time_seconds)}s\n` +
          `STUDENT QUESTION: ${question}` },
      ],
      temperature: 0.4,
      maxTokens: 700,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `AI unavailable: ${e?.message || e}` }, { status: 503 });
  }

  const { data, error } = await sb
    .from('video_qa')
    .insert({
      lecture_id: lectureId,
      user_id: user.id,
      time_seconds: Math.floor(time_seconds),
      question,
      answer,
      source_chunks: script.source_citations ?? null,
    })
    .select('id, time_seconds, question, answer, source_chunks, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ qa: data });
}
