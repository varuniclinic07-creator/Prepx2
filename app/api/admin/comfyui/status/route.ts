// GET /api/admin/comfyui/status — health check the ComfyUI server (admin-only).
// Returns connectivity + queue length so the bake-sweep page can show an
// online/offline pill without throwing 500s when the GPU box is unreachable.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import * as comfy from '@/lib/comfyui-client';

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  const settings = await comfy.getSettings(admin);
  if (!settings) {
    return NextResponse.json({
      connected: false,
      reason: 'comfyui_settings row missing — seed the table first',
    });
  }
  if (!settings.enabled) {
    return NextResponse.json({
      connected: false,
      reason: 'ComfyUI integration disabled in settings',
      host: settings.host, port: settings.port,
    });
  }

  try {
    const queue = await Promise.race([
      comfy.getQueueStatus(settings),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]) as any;
    const running = Array.isArray(queue?.queue_running) ? queue.queue_running.length : 0;
    const pending = Array.isArray(queue?.queue_pending) ? queue.queue_pending.length : 0;
    return NextResponse.json({
      connected: true,
      host: settings.host,
      port: settings.port,
      running,
      pending,
      queue_length: running + pending,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      reason: err?.message || 'failed to reach ComfyUI',
      host: settings.host, port: settings.port,
    });
  }
}
