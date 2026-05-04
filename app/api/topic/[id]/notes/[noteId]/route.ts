// /api/topic/[id]/notes/[noteId] — update + delete one note.
// RLS guarantees ownership.

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase-server';

const COLORS = ['primary','cyan','saffron','success','warning','muted','magenta','gold'] as const;

const PatchBodySchema = z.object({
  content: z.string().max(5000).optional(),
  color: z.enum(COLORS).optional(),
  position: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    z: z.number().finite(),
  }).partial().optional(),
}).refine((b) => b.content !== undefined || b.color !== undefined || b.position !== undefined, {
  message: 'Must include at least one of: content, color, position',
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id: topicId, noteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 422 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.content !== undefined) patch.content = parsed.data.content;
  if (parsed.data.color !== undefined) patch.color = parsed.data.color;
  if (parsed.data.position) {
    if (parsed.data.position.x !== undefined) patch.position_x = parsed.data.position.x;
    if (parsed.data.position.y !== undefined) patch.position_y = parsed.data.position.y;
    if (parsed.data.position.z !== undefined) patch.position_z = parsed.data.position.z;
  }

  const { data, error } = await supabase
    .from('user_topic_notes')
    .update(patch)
    .eq('id', noteId)
    .eq('topic_id', topicId)
    .select('id, content, position_x, position_y, position_z, color, created_at, updated_at')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ note: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id: topicId, noteId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_topic_notes')
    .delete()
    .eq('id', noteId)
    .eq('topic_id', topicId)
    .select('id')
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
