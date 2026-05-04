// GET /api/health/hermes — uptime probe for the Hermes worker.
//
// 200 OK   = Redis reachable AND no queue with waiting > BACKLOG_ALARM
//            AND no queue with failed > FAILED_ALARM (lifetime).
// 503      = any threshold tripped, or Redis unreachable.
//
// No auth — designed to be hit by Coolify / UptimeRobot / external probes.

import { NextResponse, type NextRequest } from 'next/server';
import { getQueueDepths } from '@/lib/queue/queues';

export const dynamic = 'force-dynamic';

const BACKLOG_ALARM = 100;
const FAILED_ALARM = 50;

export async function GET(_req: NextRequest) {
  try {
    const depths = await getQueueDepths();
    const issues: string[] = [];
    for (const [name, c] of Object.entries(depths)) {
      if (c.waiting > BACKLOG_ALARM) issues.push(`${name}: waiting=${c.waiting}>${BACKLOG_ALARM}`);
      if (c.failed > FAILED_ALARM)   issues.push(`${name}: failed=${c.failed}>${FAILED_ALARM}`);
    }
    if (issues.length === 0) {
      return NextResponse.json({ status: 'ok', queues: depths });
    }
    return NextResponse.json({ status: 'degraded', issues, queues: depths }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'down', error: err?.message || 'Redis unreachable' },
      { status: 503 }
    );
  }
}
