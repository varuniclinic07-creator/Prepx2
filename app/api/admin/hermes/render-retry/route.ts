// POST /api/admin/hermes/render-retry — manually run the classroom-lecture
// render retry sweep right now (does not wait for the nightly 2 AM cron).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { runRenderRetrySweep } from '@/lib/video/render-retry-sweep';

export async function POST(_req: NextRequest) {
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
      agent_type: 'hermes-render-retry-sweep',
      status: 'processing',
      started_at: new Date().toISOString(),
      payload: { sweep: 'hermes-render-retry-sweep', source: 'manual' },
    })
    .select('id').single();
  const taskId = row?.id as string | undefined;

  try {
    const result = await runRenderRetrySweep(admin);
    if (taskId) {
      await admin.rpc('complete_agent_task', {
        p_task_id: taskId, p_status: 'completed', p_result: result, p_error: null,
      });
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
