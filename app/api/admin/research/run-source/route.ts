// POST /api/admin/research/run-source
// Body: { sourceId }
// Spawns a research agent task for the source. The Hermes worker will pick
// it up via claim_next_agent_task and run scrape→enrich→link inline.
//
// If Redis/worker is offline, the row sits 'queued' until a worker boots.

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { spawnAgent } from '@/lib/agents/hermes-dispatch';
import { SOURCE_REGISTRY } from '@/lib/scraper/config';

export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const sourceId: string | undefined = body?.sourceId;
  if (!sourceId) return NextResponse.json({ error: 'sourceId required' }, { status: 400 });

  const source = SOURCE_REGISTRY.find(s => s.id === sourceId);
  if (!source) return NextResponse.json({ error: 'unknown_source' }, { status: 400 });

  const admin = getAdminClient();
  const result = await spawnAgent(admin, {
    agentType: 'research',
    payload: { source: 'admin-run-source', sourceId, sourceName: source.name },
    priority: 5,
  });
  return NextResponse.json({ taskId: result.taskId, queueName: result.queueName });
}
