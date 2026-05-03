// Admin API — single CA video newspaper CRUD.
// Sprint 4-2.

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('ca_video_newspapers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ video: data });
}

const patchSchema = z.object({
  action: z.enum(['approve', 'reject', 'regenerate']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: z.infer<typeof patchSchema>;
  try { body = patchSchema.parse(await req.json()); } catch {
    return NextResponse.json({ error: 'Invalid body. action: approve | reject | regenerate' }, { status: 400 });
  }

  const admin = getAdminClient();

  if (body.action === 'approve') {
    await admin.from('ca_video_newspapers').update({ approval_status: 'approved', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ success: true, action: 'approved' });
  }

  if (body.action === 'reject') {
    await admin.from('ca_video_newspapers').update({ approval_status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ success: true, action: 'rejected' });
  }

  // Regenerate: re-spawn the job
  const { data: existing } = await admin.from('ca_video_newspapers').select('bundle_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { taskId } = await spawnAgent(admin, {
    agentType: 'ca_video',
    payload: { bundleId: existing.bundle_id },
  });

  await admin.from('ca_video_newspapers').update({ approval_status: 'pending', render_status: 'r3f_only' }).eq('id', id);
  return NextResponse.json({ success: true, action: 'regenerated', taskId });
}
