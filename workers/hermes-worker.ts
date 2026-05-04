// Hermes 24/7 Worker (B2-2).
//
// Boots a BullMQ Worker per queue. Each worker:
//   1) Calls public.claim_next_agent_task(agent_type, worker_id) to atomically
//      flip the matching agent_tasks row to 'processing'.
//   2) Runs the queue's processor (coach/study real work; research/content/
//      script/render = structured deferral to the owning batch).
//   3) Calls public.complete_agent_task(...) to flip to terminal status.
//
// Repeatable jobs schedule the three Hermes sweeps via BullMQ's cron support,
// pinned to Asia/Kolkata so 00:30 means India, not UTC.

import { Worker, Queue, Job, QueueEvents } from 'bullmq';
import pino from 'pino';
import { getConnection } from '../lib/queue/redis';
import {
  ALL_QUEUE_NAMES,
  type QueueName,
  type CoachJobPayload,
  type StudyJobPayload,
} from '../lib/queue/types';
import { getQueue, DEFAULT_JOB_OPTS, QUEUE_WORKER_CONFIG } from '../lib/queue/queues';
import { getAdminClient } from '../lib/supabase-admin';
import {
  runHermesPlanner,
  runHermesResearchSweep,
  runHermesContentSweep,
  runHermesBundleSweep,
  spawnAgent,
} from '../lib/agents/hermes-dispatch';
import { prelimsGuide, mainsGuide, interviewGuide } from '../lib/agents/guide-agents';
import {
  processContentJob,
  processScriptJob,
  processRenderJob,
} from '../lib/video/processors';
import { processResearchJob } from '../lib/scraper/processor';
import { processRefineJob } from '../lib/refine/processors';
import { processBundleJob } from '../lib/bundles/processors';
import { processMnemonicJob } from '../lib/mnemonic/processors';
import { processImagineJob } from '../lib/imagine/processors';
import { processMindmapJob } from '../lib/mindmap/processors';
import { processInterviewJob } from '../lib/interview/processors';
import { processShortsJob } from '../lib/shorts/processors';
import { processCaVideoJob } from '../lib/ca-video/processors';
import { runBakeSweep } from '../lib/video/bake-bridge';
import { runRenderRetrySweep } from '../lib/video/render-retry-sweep';

const log = pino({
  name: 'hermes-worker',
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}),
});

const WORKER_ID = `hermes-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;

// ──────────────────────────────────────────────────────────────────────────
// Shared lifecycle wrappers
// ──────────────────────────────────────────────────────────────────────────

async function claimTask(agentType: string): Promise<{ id: string } | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc('claim_next_agent_task', {
    p_agent_type: agentType,
    p_worker_id: WORKER_ID,
  });
  if (error) {
    log.error({ err: error.message, agentType }, 'claim_next_agent_task failed');
    return null;
  }
  // RPC returns the row when claimed; an empty/null id means nothing to claim
  // (should be rare since BullMQ already gave us a job).
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return { id: row.id };
}

async function completeTask(
  taskId: string,
  status: 'completed' | 'failed' | 'dead_letter',
  result: Record<string, any> | null,
  errorMessage: string | null
): Promise<void> {
  const supabase = getAdminClient();
  const { error } = await supabase.rpc('complete_agent_task', {
    p_task_id: taskId,
    p_status: status,
    p_result: result,
    p_error: errorMessage,
  });
  if (error) {
    log.error({ err: error.message, taskId, status }, 'complete_agent_task failed');
  }
}

/**
 * Wraps a queue's processor with the SQL claim → process → complete cycle.
 * BullMQ retries are governed by job opts; on final failure we let BullMQ
 * mark the job failed and our `failed` event handler promotes the
 * agent_tasks row to dead_letter via complete_agent_task.
 */
function wrapProcessor(
  agentType: string,
  inner: (job: Job, taskId: string) => Promise<Record<string, any>>
) {
  return async (job: Job): Promise<Record<string, any>> => {
    const explicitTaskId: string | undefined = job.data?.taskId;
    const claimAgent = explicitTaskId ? null : await claimTask(agentType);
    const taskId = explicitTaskId || claimAgent?.id;
    if (!taskId) {
      const reason = 'no agent_task claimable for this job';
      log.warn({ jobId: job.id, agentType }, reason);
      throw new Error(reason);
    }

    // If we have an explicit taskId from the spawn, ensure the row is
    // marked processing (idempotent — claim_next_agent_task is also safe).
    if (explicitTaskId) {
      const supabase = getAdminClient();
      await supabase
        .from('agent_tasks')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', explicitTaskId)
        .eq('status', 'queued');
    }

    try {
      const result = await inner(job, taskId);
      await completeTask(taskId, 'completed', result, null);
      return result;
    } catch (err: any) {
      // Re-throw so BullMQ records the attempt and can retry with backoff.
      // The 'failed' event handler will mark dead_letter when attempts exhausted.
      const msg = err?.message || String(err);
      log.error({ err: msg, jobId: job.id, taskId }, 'processor threw');
      // Note: we DO NOT call completeTask here — BullMQ will retry. The
      // 'failed' handler below handles the terminal case.
      throw err;
    }
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Real processors (coach, study)
// ──────────────────────────────────────────────────────────────────────────

async function processCoachJob(job: Job, taskId: string) {
  const data = job.data as CoachJobPayload & { source?: string };
  const supabase = getAdminClient();

  const guide =
    data.agentType === 'mains' ? mainsGuide :
    data.agentType === 'interview' ? interviewGuide :
    prelimsGuide;

  const message = await guide.coach(
    data.userContext || 'No prior context',
    data.userAction || 'general_check_in'
  );

  if (data.userId) {
    const { error } = await supabase.from('coach_messages').insert({
      user_id: data.userId,
      agent_type: data.agentType || 'prelims',
      message,
    });
    if (error) {
      log.warn({ err: error.message, userId: data.userId }, 'coach_messages insert failed (non-fatal)');
    }
  }

  return { taskId, agentType: data.agentType || 'prelims', message, persisted: !!data.userId };
}

async function processStudyJob(job: Job, taskId: string) {
  const data = job.data as StudyJobPayload & { topicId?: string; gapType?: string; severity?: number };
  const supabase = getAdminClient();

  let topicId = data.topicId;
  let reason = data.reason || 'planner-followup';

  if (!topicId && data.userId) {
    // Fall back to lowest-severity weak area if planner didn't pick one.
    const { data: weak } = await supabase
      .from('user_weak_areas')
      .select('topic_id, gap_type, severity')
      .eq('user_id', data.userId)
      .order('severity', { ascending: false })
      .limit(1);
    if (weak && weak.length > 0) {
      topicId = weak[0].topic_id;
      reason = `weak-area:${weak[0].gap_type} (severity ${weak[0].severity})`;
    }
  }

  if (data.userId && topicId) {
    const { error } = await supabase.from('study_recommendations').insert({
      user_id: data.userId,
      topic_id: topicId,
      reason,
    });
    if (error) {
      log.warn({ err: error.message, userId: data.userId }, 'study_recommendations insert failed');
    }

    // Chain a content-job so the topic's content is freshened before the
    // user opens it. B2-3 owns the actual content generator.
    await spawnAgent(supabase, {
      agentType: 'content',
      userId: data.userId,
      payload: {
        source: 'study-followup',
        topicId,
        reason: 'followup-from-study',
      },
    });
  }

  return { taskId, topicId: topicId || null, reason, recommendationPersisted: !!(data.userId && topicId) };
}

// ──────────────────────────────────────────────────────────────────────────
// Deferred processors (research, content, script, render)
//
// These are NOT stubs. They consume the BullMQ job, mark the agent_tasks
// row 'completed' with a structured `deferredTo` payload, and emit a log.
// The owning batch will REPLACE this processor when it merges:
//
//   research → B2-4 (lib/scraper/pipeline.ts wired to BullMQ)
//   content  → B2-3 (script writer + smart book chapters)
//   script   → B2-3 (lecture video script generation)
//   render   → B2-3 (ComfyUI/LTX render orchestration)
//
// Issue tracker: see CHECKPOINT.md "Batch 2 features" table.
// ──────────────────────────────────────────────────────────────────────────

function makeDeferredProcessor(deferredTo: 'B2-3' | 'B2-4', queue: QueueName) {
  return async (job: Job, taskId: string) => {
    const result = {
      deferredTo,
      queue,
      jobName: job.name,
      data: job.data,
      note: `Processor handoff — owning batch will replace this when it merges.`,
    };
    log.info({ taskId, deferredTo, queue, jobId: job.id }, 'deferred processor consumed');
    return result;
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Queue → processor wiring
// ──────────────────────────────────────────────────────────────────────────

const PROCESSORS: Record<QueueName, (job: Job, taskId: string) => Promise<Record<string, any>>> = {
  'coach-jobs':     processCoachJob,
  'study-jobs':     processStudyJob,
  'research-jobs':  processResearchJob,
  'content-jobs':   processContentJob,
  'script-jobs':    processScriptJob,
  'render-jobs':    processRenderJob,
  'refine-jobs':    processRefineJob,
  'bundle-jobs':    processBundleJob,
  'mnemonic-jobs':  processMnemonicJob,
  'imagine-jobs':   processImagineJob,
  'mindmap-jobs':   processMindmapJob,
  'shorts-jobs':    processShortsJob,
  'ca-video-jobs':  processCaVideoJob,
  'interview-jobs': processInterviewJob,
  'dead-letter':    async (_job, taskId) => ({ taskId, note: 'observed by dead-letter consumer' }),
};

const AGENT_TYPE_FOR_QUEUE: Record<QueueName, string> = {
  'coach-jobs':     'coach',
  'study-jobs':     'study',
  'research-jobs':  'research',
  'content-jobs':   'content',
  'script-jobs':    'script',
  'render-jobs':    'render',
  'refine-jobs':    'refine',
  'bundle-jobs':    'bundle',
  'mnemonic-jobs':  'mnemonic',
  'imagine-jobs':   'imagine',
  'mindmap-jobs':   'mindmap',
  'shorts-jobs':    'shorts',
  'ca-video-jobs':  'ca_video',
  'interview-jobs': 'interview',
  'dead-letter':    'dead_letter',
};

// ──────────────────────────────────────────────────────────────────────────
// Sweep registration (BullMQ repeatable jobs, pinned to Asia/Kolkata)
// ──────────────────────────────────────────────────────────────────────────

const SWEEP_QUEUE_NAME = 'hermes-sweeps';

interface SweepDef {
  name: 'hermes-planner' | 'hermes-research-sweep' | 'hermes-content-sweep' | 'hermes-bundle-sweep' | 'hermes-bake-sweep' | 'hermes-render-retry-sweep';
  pattern: string;
}

const SWEEPS: SweepDef[] = [
  { name: 'hermes-planner',             pattern: '30 0 * * *' },
  { name: 'hermes-research-sweep',      pattern: '0  9 * * *' },
  { name: 'hermes-content-sweep',       pattern: '0 11 * * *' },
  { name: 'hermes-bundle-sweep',        pattern: '0  7 * * *' },
  { name: 'hermes-bake-sweep',         pattern: '0  1 * * *' },
  { name: 'hermes-render-retry-sweep',  pattern: '0  2 * * *' },
];

async function registerSweeps(): Promise<Queue> {
  const queue = new Queue(SWEEP_QUEUE_NAME, {
    connection: getConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTS,
  });
  for (const sweep of SWEEPS) {
    await queue.add(sweep.name, { sweep: sweep.name }, {
      repeat: { pattern: sweep.pattern, tz: 'Asia/Kolkata' },
      jobId: `repeat:${sweep.name}`,
    });
    log.info({ sweep: sweep.name, pattern: sweep.pattern }, 'sweep registered');
  }
  return queue;
}

async function processSweep(job: Job): Promise<Record<string, any>> {
  const supabase = getAdminClient();
  const sweepName = job.name as SweepDef['name'];
  const startedAt = Date.now();
  let result: Record<string, any> = {};

  // Persist a marker row in agent_tasks so it shows up in the admin UI
  // and getHermesStatus() can report a "last sweep" timestamp.
  const { data: markerRow } = await supabase
    .from('agent_tasks')
    .insert({ agent_type: sweepName, status: 'processing', started_at: new Date().toISOString(), payload: { sweep: sweepName } })
    .select('id').single();
  const markerId = markerRow?.id as string | undefined;

  try {
    if (sweepName === 'hermes-planner')        result = await runHermesPlanner(supabase);
    else if (sweepName === 'hermes-research-sweep') result = await runHermesResearchSweep(supabase);
    else if (sweepName === 'hermes-content-sweep')  result = await runHermesContentSweep(supabase);
    else if (sweepName === 'hermes-bundle-sweep')   result = await runHermesBundleSweep(supabase);
    else if (sweepName === 'hermes-bake-sweep')    result = await runBakeSweep();
    else if (sweepName === 'hermes-render-retry-sweep') result = await runRenderRetrySweep(supabase);
    else throw new Error(`unknown sweep ${sweepName}`);

    if (markerId) await completeTask(markerId, 'completed', result, null);
    log.info({ sweep: sweepName, durationMs: Date.now() - startedAt, ...result }, 'sweep completed');
    return result;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (markerId) await completeTask(markerId, 'failed', null, msg);
    log.error({ sweep: sweepName, err: msg }, 'sweep failed');
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Boot
// ──────────────────────────────────────────────────────────────────────────

const workers: Worker[] = [];
const queueEvents: QueueEvents[] = [];
let sweepQueue: Queue | null = null;
let sweepWorker: Worker | null = null;

async function boot(): Promise<void> {
  log.info({ workerId: WORKER_ID, redis: process.env.REDIS_URL || 'redis://localhost:6379' },
    'Hermes worker started');

  // 1. One Worker per queue.
  for (const name of ALL_QUEUE_NAMES) {
    const agentType = AGENT_TYPE_FOR_QUEUE[name];
    const inner = PROCESSORS[name];
    const cfg = QUEUE_WORKER_CONFIG[name];
    const w = new Worker(
      name,
      wrapProcessor(agentType, inner),
      {
        connection: getConnection(),
        concurrency: cfg.concurrency,
        ...(cfg.limiter ? { limiter: cfg.limiter } : {}),
        // Reclaim jobs whose worker died mid-flight after 60s; cap recoveries
        // at 2 so a perpetually-hanging job is promoted to dead_letter.
        stalledInterval: 60_000,
        maxStalledCount: 2,
      }
    );
    log.info({ queue: name, concurrency: cfg.concurrency, limiter: cfg.limiter ?? null },
      'worker config');
    w.on('failed', async (job, err) => {
      log.error({ queue: name, jobId: job?.id, attemptsMade: job?.attemptsMade, err: err?.message },
        'job failed');
      // Promote to dead_letter when BullMQ has exhausted attempts.
      const exhausted = job && job.attemptsMade >= (job.opts?.attempts ?? 3);
      const taskId = job?.data?.taskId;
      if (exhausted && taskId) {
        await completeTask(taskId, 'dead_letter', null, err?.message || 'exhausted retries');
        // Mirror to the dead-letter queue for observability.
        await getQueue('dead-letter').add('failed', {
          taskId,
          originQueue: name,
          reason: err?.message || 'exhausted retries',
        });
      }
    });
    w.on('completed', (job) => {
      log.debug({ queue: name, jobId: job.id }, 'job completed');
    });
    workers.push(w);

    // QueueEvents lets the admin UI see job state changes if it ever opens
    // a websocket; for B2-2 we just keep it instantiated for completeness.
    const events = new QueueEvents(name, { connection: getConnection() });
    queueEvents.push(events);

    log.info({ queue: name, agentType }, 'worker registered');
  }

  // 2. Sweep scheduler.
  sweepQueue = await registerSweeps();
  sweepWorker = new Worker(SWEEP_QUEUE_NAME, processSweep, {
    connection: getConnection(),
    concurrency: 1,
  });
  sweepWorker.on('failed', (job, err) => {
    log.error({ sweep: job?.name, err: err?.message }, 'sweep worker failed');
  });

  log.info({ workers: workers.length, sweeps: SWEEPS.length }, 'Hermes worker fully online');
}

// ──────────────────────────────────────────────────────────────────────────
// Graceful shutdown
// ──────────────────────────────────────────────────────────────────────────

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, 'shutting down workers');
  await Promise.allSettled([
    ...workers.map(w => w.close()),
    ...queueEvents.map(e => e.close()),
    sweepWorker?.close(),
    sweepQueue?.close(),
  ]);
  // Close shared connection last.
  try {
    const conn = getConnection();
    await conn.quit();
  } catch {
    // ignore
  }
  log.info('shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT',  () => { void shutdown('SIGINT'); });
process.on('unhandledRejection', (reason) => {
  log.error({ reason }, 'unhandledRejection');
});

export async function start(): Promise<void> {
  await boot();
}

// CLI entry — allow `tsx workers/hermes-worker.ts` to run directly.
const isDirect = (typeof require !== 'undefined' && require.main === module)
  || process.argv[1]?.endsWith('hermes-worker.ts')
  || process.argv[1]?.endsWith('hermes-worker.js');
if (isDirect) {
  boot().catch(err => {
    log.fatal({ err: err?.message }, 'failed to boot');
    process.exit(1);
  });
}
