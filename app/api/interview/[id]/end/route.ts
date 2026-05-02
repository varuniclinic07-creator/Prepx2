import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

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

  const { error: upErr } = await sb
    .from('interview_sessions')
    .update({ status: 'debrief_pending' })
    .eq('id', id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  try {
    await spawnAgent(sb, {
      agentType: 'interview',
      userId: user.id,
      payload: { sessionId: id, userId: user.id, phase: 'debrief-render' },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: true, warning: `agent spawn failed: ${err?.message}` }, { status: 202 });
  }

  return NextResponse.json({ ok: true });
}
