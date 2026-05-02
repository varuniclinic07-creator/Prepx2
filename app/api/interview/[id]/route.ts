import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET interview session bundle — session row + ordered turns + debrief.
// RLS guards owner-only access.

export async function GET(
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
    .select('id, user_id, topic_focus, status, total_score, started_at, ended_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [{ data: turns }, { data: debrief }] = await Promise.all([
    sb.from('interview_turns')
      .select('id, turn_index, judge, question, user_answer, score, feedback, created_at')
      .eq('session_id', id)
      .order('turn_index', { ascending: true })
      .order('judge', { ascending: true }),
    sb.from('interview_debriefs')
      .select('id, summary, strengths, weaknesses, scene_spec, render_status, created_at')
      .eq('session_id', id)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    session,
    turns: turns ?? [],
    debrief: debrief ?? null,
  });
}
