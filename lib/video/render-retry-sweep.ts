// Sprint 6 S6-4: render-retry sweep.
//
// Finds video_render_jobs with status='failed' AND retry_until > now() (or
// null retry_until + retry_count < 3), enqueues a fresh render-job, bumps
// retry_count, and writes a video_render_attempts audit row.
//
// Wired into workers/hermes-worker.ts as a daily 2 AM IST cron sweep.

import type { SupabaseClient } from '@supabase/supabase-js';
import { spawnAgent } from '../agents/hermes-dispatch';

const MAX_RETRIES = 3;
const DEFAULT_WINDOW_HOURS = 24;

export interface RenderRetrySweepResult {
  examined: number;
  retried: number;
  exhausted: number;
  errors: string[];
}

export async function runRenderRetrySweep(supabase: SupabaseClient): Promise<RenderRetrySweepResult> {
  const result: RenderRetrySweepResult = { examined: 0, retried: 0, exhausted: 0, errors: [] };
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await supabase
    .from('video_render_jobs')
    .select('id, script_id, lecture_id, attempt, retry_count, retry_until, error_text')
    .eq('status', 'failed')
    .or(`retry_until.gte.${nowIso},retry_until.is.null`)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const row of rows ?? []) {
    result.examined++;
    const retryCount = row.retry_count ?? 0;
    if (retryCount >= MAX_RETRIES) {
      result.exhausted++;
      // Set a very-past retry_until so future sweeps skip; cancel the row.
      await supabase.from('video_render_jobs')
        .update({ status: 'cancelled', retry_until: nowIso })
        .eq('id', row.id);
      continue;
    }

    if (!row.script_id) {
      result.errors.push(`render_job ${row.id} has no script_id; skipping`);
      continue;
    }

    try {
      // Audit current state before re-queue.
      await supabase.from('video_render_attempts').insert({
        render_job_id: row.id,
        attempt: row.attempt ?? 0,
        status: 'failed',
        error_text: row.error_text || 'unspecified',
      });

      // Bump retry counters; flip back to queued.
      const newRetryUntil = row.retry_until
        || new Date(Date.now() + DEFAULT_WINDOW_HOURS * 3_600_000).toISOString();

      await supabase.from('video_render_jobs').update({
        status: 'queued',
        retry_count: retryCount + 1,
        retry_until: newRetryUntil,
        last_attempted_at: nowIso,
        error_text: null,
      }).eq('id', row.id);

      // Spawn a fresh render-job. The worker will pick it up like any other.
      await spawnAgent(supabase, {
        agentType: 'render',
        payload: { scriptId: row.script_id, retryOf: row.id },
        priority: 4,
      });

      result.retried++;
    } catch (err: any) {
      result.errors.push(`render_job ${row.id}: ${err?.message || String(err)}`);
    }
  }

  return result;
}
