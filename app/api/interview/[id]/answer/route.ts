import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

const JUDGES = ['chairperson', 'expert', 'behavioural'] as const;

const AnswerSchema = z.object({
  turnIndex: z.number().int().min(1).max(50),
  answers: z.array(z.object({
    judge: z.enum(JUDGES),
    text: z.string().trim().min(1).max(8000),
  })).min(1).max(3),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'invalid JSON' }, { status: 400 }); }
  const parsed = AnswerSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 },
    );
  }
  const { turnIndex, answers } = parsed.data;

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error: sErr } = await sb
    .from('interview_sessions')
    .select('id, user_id, status')
    .eq('id', id)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (session.status !== 'in_progress') {
    return NextResponse.json({ error: `session status is ${session.status}` }, { status: 409 });
  }

  for (const a of answers) {
    const { error: upErr } = await sb
      .from('interview_turns')
      .update({ user_answer: a.text })
      .eq('session_id', id)
      .eq('turn_index', turnIndex)
      .eq('judge', a.judge);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // Touch updated_at for client polling consistency.
  await sb.from('interview_sessions').update({ updated_at: new Date().toISOString() }).eq('id', id);

  // Queue next round of questions.
  try {
    await spawnAgent(sb, {
      agentType: 'interview',
      userId: user.id,
      payload: { sessionId: id, userId: user.id, phase: 'panel-question' },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: true, warning: `agent spawn failed: ${err?.message}` }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
