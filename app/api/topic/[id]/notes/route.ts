// /api/topic/[id]/notes — list + create user notes for a topic.
// RLS guarantees ownership (auth.uid()=user_id). Service-role NOT used.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const COLORS = ['primary','cyan','saffron','success','warning','muted','magenta','gold'] as const;

const PositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
}).partial().default({});

const CreateBodySchema = z.object({
  content: z.string().max(5000).default(''),
  position: PositionSchema.optional(),
  color: z.enum(COLORS).default('primary'),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_topic_notes')
    .select('id, content, position_x, position_y, position_z, color, created_at, updated_at')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = CreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 422 });
  }
  const { content, color, position } = parsed.data;

  const { data, error } = await supabase
    .from('user_topic_notes')
    .insert({
      user_id: user.id,
      topic_id: topicId,
      content,
      color,
      position_x: position?.x ?? (Math.random() * 6 - 3),
      position_y: position?.y ?? (Math.random() * 4 - 2),
      position_z: position?.z ?? 0,
    })
    .select('id, content, position_x, position_y, position_z, color, created_at, updated_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
