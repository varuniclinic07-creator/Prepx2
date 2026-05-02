import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';

// Re-route: this file already existed for the legacy /api/interview/evaluate
// path. Adding an authenticated POST that creates a Sprint 3 panel session.

const StartSchema = z.object({
  topicFocus: z.string().trim().min(1).max(120).optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); } catch { raw = {}; }
  const parsed = StartSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 },
    );
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: session, error: insErr } = await sb
    .from('interview_sessions')
    .insert({
      user_id: user.id,
      topic_focus: parsed.data.topicFocus ?? null,
      status: 'in_progress',
    })
    .select('id')
    .single();
  if (insErr || !session?.id) {
    return NextResponse.json(
      { error: insErr?.message || 'failed to create session' },
      { status: 500 },
    );
  }

  try {
    await spawnAgent(sb, {
      agentType: 'interview',
      userId: user.id,
      payload: {
        sessionId: session.id,
        userId: user.id,
        phase: 'panel-question',
      },
    });
  } catch (err: any) {
    // Spawn failure shouldn't strand the session row — return it so the
    // user can retry; admins can inspect the failed agent_task.
    return NextResponse.json(
      { sessionId: session.id, warning: `agent spawn failed: ${err?.message}` },
      { status: 202 },
    );
  }

  return NextResponse.json({ sessionId: session.id });
}
