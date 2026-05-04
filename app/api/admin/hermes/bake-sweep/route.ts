// POST /api/admin/hermes/bake-sweep — manually trigger the R3F → ComfyUI MP4
// baking sweep right now (does not wait for the nightly 1 AM cron).
// Used by /admin/bake-sweep "Bake now" button.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { runBakeSweep } from '@/lib/video/bake-bridge';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data: row } = await admin
    .from('agent_tasks')
    .insert({
      agent_type: 'hermes-bake-sweep',
      status: 'processing',
      started_at: new Date().toISOString(),
      payload: { sweep: 'hermes-bake-sweep', source: 'manual' },
    })
    .select('id').single();
  const taskId = row?.id as string | undefined;

  try {
    const result = await runBakeSweep();
    if (taskId) {
      await admin.rpc('complete_agent_task', {
        p_task_id: taskId, p_status: 'completed', p_result: result, p_error: null,
      });
    }
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin/bake-sweep', req.url));
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (taskId) {
      await admin.rpc('complete_agent_task', {
        p_task_id: taskId, p_status: 'failed', p_result: null, p_error: msg,
      });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
