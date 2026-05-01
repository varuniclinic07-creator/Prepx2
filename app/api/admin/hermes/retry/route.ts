// POST /api/admin/hermes/retry — admin re-queue a dead-letter agent_task.
// Body: form-encoded `taskId=<uuid>` (from the admin retry button).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { getQueue } from '@/lib/queue/queues';
import { QUEUE_FOR_AGENT, type AgentType } from '@/lib/queue/types';

export async function POST(req: NextRequest) {
  // Auth: middleware already gates /admin/* but the API path is at /api/...
  // so we re-check role here.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let taskId: string | null = null;
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    taskId = body?.taskId ?? null;
  } else {
    const form = await req.formData().catch(() => null);
    taskId = (form?.get('taskId') as string) || null;
  }

  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

  // Use service-role client to call the admin SQL helper.
  const admin = getAdminClient();
  const { data: nextStatus, error } = await admin.rpc('requeue_failed_task', { p_task_id: taskId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If it went back to queued, also re-add to BullMQ so the worker sees it.
  if (nextStatus === 'queued') {
    const { data: task } = await admin
      .from('agent_tasks')
      .select('id, agent_type, payload')
      .eq('id', taskId)
      .single();
    if (task && QUEUE_FOR_AGENT[task.agent_type as AgentType]) {
      const queue = getQueue(QUEUE_FOR_AGENT[task.agent_type as AgentType]);
      await queue.add(task.agent_type, { ...(task.payload || {}), taskId: task.id }, { jobId: task.id });
    }
  }

  // For form-encoded posts, redirect back to /admin/hermes so the page reloads.
  if (!ct.includes('application/json')) {
    return NextResponse.redirect(new URL('/admin/hermes', req.url));
  }
  return NextResponse.json({ ok: true, nextStatus });
}
