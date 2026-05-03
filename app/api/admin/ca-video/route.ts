// Admin API — list CA video newspapers, trigger regeneration.
// Sprint 4-2.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('ca_video_newspapers')
    .select('id, bundle_id, bundle_date, title, theme, duration_seconds, render_status, approval_status, generated_by, created_at')
    .order('bundle_date', { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ videos: data || [] });
}

const createSchema = z.object({
  bundleId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body. Required: bundleId (uuid)' }, { status: 400 });
  }

  const admin = getAdminClient();
  const { taskId } = await spawnAgent(admin, {
    agentType: 'ca_video',
    payload: { bundleId: body.bundleId },
  });

  return NextResponse.json({ taskId }, { status: 201 });
}
