import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import {
  createEvent, joinEvent, submitAnswer, getLeaderboard, getEvent, getActiveEvents, markEventLive, markEventCompleted,
} from '@/lib/battle-royale';
import { z } from 'zod';

const BodySchema = z.object({ action: z.string() }).passthrough();

export async function POST(request: Request) {
  try {
    let raw: unknown;
    try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const body = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    switch (body.action) {
      case 'create': {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        const event = await createEvent(supabase, String(body.event_start || new Date().toISOString()), Number(body.question_count), Number(body.prize_pool), String(body.quiz_id));
        return NextResponse.json({ event_id: event.id });
      }
      case 'join': {
        const participant = await joinEvent(supabase, String(body.event_id), user.id);
        return NextResponse.json({ participant_id: participant.id });
      }
      case 'answer': {
        const answerText = String(body.answer || '');
        if (answerText.length > 10000) return NextResponse.json({ error: 'Input too long. Max 10,000 chars.' }, { status: 413 });
        const result = await submitAnswer(supabase, String(body.event_id), user.id, String(body.question_id), answerText, String(body.correct_option || ''));
        return NextResponse.json(result);
      }
      case 'live': {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        await markEventLive(supabase, String(body.event_id));
        return NextResponse.json({ ok: true });
      }
      case 'complete': {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        await markEventCompleted(supabase, String(body.event_id));
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
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const type = searchParams.get('type');

    if (type === 'active') {
      const events = await getActiveEvents(supabase);
      return NextResponse.json({ events });
    }
    if (type === 'status' && eventId) {
      const ev = await getEvent(supabase, eventId);
      return NextResponse.json({ event: ev });
    }
    if (type === 'leaderboard' && eventId) {
      const board = await getLeaderboard(supabase, eventId);
      return NextResponse.json({ leaderboard: board });
    }
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
