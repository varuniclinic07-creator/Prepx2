// Single Concept Short API — get, approve, reject.
// Sprint 4-1.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ error: 'Invalid short ID' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('concept_shorts')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ short: data });
}

const patchSchema = z.object({
  action: z.enum(['approve', 'reject', 'regenerate']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Invalid short ID' }, { status: 400 });

  let body: z.infer<typeof patchSchema>;
  try { body = patchSchema.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'Invalid body. action: approve | reject | regenerate' }, { status: 400 });
  }

  const admin = getAdminClient();

  if (body.action === 'approve') {
    await admin.from('concept_shorts').update({ approval_status: 'approved', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ success: true, action: 'approved' });
  }

  if (body.action === 'reject') {
    await admin.from('concept_shorts').update({ approval_status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ success: true, action: 'rejected' });
  }

  // Regenerate: re-spawn the job
  const { data: existing } = await admin.from('concept_shorts').select('topic_id, concept_tag, user_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Short not found' }, { status: 404 });

  const { taskId } = await spawnAgent(admin, {
    agentType: 'shorts',
    userId: existing.user_id || 'system',
    payload: {
      topicId: existing.topic_id,
      conceptTag: existing.concept_tag,
      shortId: id,
    },
  });

  await admin.from('concept_shorts').update({ approval_status: 'pending', render_status: 'r3f_only' }).eq('id', id);

  return NextResponse.json({ success: true, action: 'regenerated', taskId });
}
