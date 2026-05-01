// GET  /api/lectures/[id]/notes  → list current user's notes for this lecture (oldest first)
// POST /api/lectures/[id]/notes  → { time_seconds, body } create a note pinned to a timestamp
//
// RLS enforces self-only read/write; we still re-check auth here so we can return 401
// instead of an empty array on anonymous traffic.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: lectureId } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await sb
    .from('video_notes')
    .select('id, time_seconds, body, created_at, updated_at')
    .eq('lecture_id', lectureId)
    .order('time_seconds', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: lectureId } = await ctx.params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const time_seconds = Number(body?.time_seconds);
  const text: string = String(body?.body ?? '').trim();
  if (!Number.isFinite(time_seconds) || time_seconds < 0) {
    return NextResponse.json({ error: 'time_seconds must be >= 0' }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: 'body required' }, { status: 400 });
  if (text.length > 4000) return NextResponse.json({ error: 'body too long' }, { status: 400 });

  const { data, error } = await sb
    .from('video_notes')
    .insert({
      lecture_id: lectureId,
      user_id: user.id,
      time_seconds: Math.floor(time_seconds),
      body: text,
    })
    .select('id, time_seconds, body, created_at, updated_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data });
}
