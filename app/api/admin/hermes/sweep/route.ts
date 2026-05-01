// POST /api/admin/hermes/sweep — manually trigger all three Hermes sweeps now.
// Used by the "Trigger sweep now" button on /admin/hermes; also handy for E2E.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import {
  runHermesPlanner,
  runHermesResearchSweep,
  runHermesContentSweep,
} from '@/lib/agents/hermes-dispatch';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdminClient();

  // Mirror the worker's sweep marker logic so /admin/hermes can show
  // "last sweep" timestamps even when the worker process isn't running.
  async function withMarker(name: string, fn: () => Promise<Record<string, any>>) {
    const { data: row } = await admin
      .from('agent_tasks')
      .insert({ agent_type: name, status: 'processing', started_at: new Date().toISOString(), payload: { sweep: name, source: 'manual' } })
      .select('id').single();
    const id = row?.id as string | undefined;
    try {
      const result = await fn();
      if (id) await admin.rpc('complete_agent_task', { p_task_id: id, p_status: 'completed', p_result: result, p_error: null });
      return result;
    } catch (err: any) {
      if (id) await admin.rpc('complete_agent_task', { p_task_id: id, p_status: 'failed', p_result: null, p_error: err?.message || String(err) });
      throw err;
    }
  }

  try {
    const [planner, research, content] = await Promise.all([
      withMarker('hermes-planner',         () => runHermesPlanner(admin)),
      withMarker('hermes-research-sweep',  () => runHermesResearchSweep(admin)),
      withMarker('hermes-content-sweep',   () => runHermesContentSweep(admin)),
    ]);
    const ct = req.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin/hermes', req.url));
    }
    return NextResponse.json({ ok: true, planner, research, content });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'sweep failed' }, { status: 500 });
  }
}
