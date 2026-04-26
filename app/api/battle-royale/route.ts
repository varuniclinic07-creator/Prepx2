import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  createEvent,
  joinEvent,
  submitAnswer,
  getLeaderboard,
  getEvent,
  getActiveEvents,
  markEventLive,
  markEventCompleted,
} from '@/lib/battle-royale';

type Body = { action: string } & Record<string, any>;

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  try {
    switch (body.action) {
      case 'create': {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const event = await createEvent(body.event_start || new Date().toISOString(), body.question_count, body.prize_pool, body.quiz_id);
        return NextResponse.json({ event_id: event.id });
      }
      case 'join': {
        const participant = await joinEvent(body.event_id, user.id);
        return NextResponse.json({ participant_id: participant.id });
      }
      case 'answer': {
        const result = await submitAnswer(body.event_id, user.id, body.question_id, body.answer, body.correct_option);
        return NextResponse.json(result);
      }
      case 'live': {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        await markEventLive(body.event_id);
        return NextResponse.json({ ok: true });
      }
      case 'complete': {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        await markEventCompleted(body.event_id);
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('event_id');
  const type = searchParams.get('type');

  try {
    if (type === 'active') {
      const events = await getActiveEvents();
      return NextResponse.json({ events });
    }
    if (type === 'status' && eventId) {
      const ev = await getEvent(eventId);
      return NextResponse.json({ event: ev });
    }
    if (type === 'leaderboard' && eventId) {
      const board = await getLeaderboard(eventId);
      return NextResponse.json({ leaderboard: board });
    }
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
