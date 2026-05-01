// BullMQ Queue factory. One Queue per logical agent type, plus a dead-letter
// queue. Workers (workers/hermes-worker.ts) consume these; the dispatcher
// (lib/agents/hermes.ts → spawnAgent) produces.

import { Queue, type JobsOptions } from 'bullmq';
import { getConnection } from './redis';
import { ALL_QUEUE_NAMES, type QueueName } from './types';

export const DEFAULT_JOB_OPTS: JobsOptions = {
  // Keep recently-finished jobs visible for 24h, then GC; fail-state lives 7d.
  removeOnComplete: { age: 86_400, count: 1_000 },
  removeOnFail:     { age: 604_800 },
  attempts: 3,
  backoff:  { type: 'exponential', delay: 5_000 },
};

const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  let q = queues.get(name);
  if (q) return q;
  q = new Queue(name, {
    connection: getConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTS,
  });
  queues.set(name, q);
  return q;
}

export function listQueues(): Record<QueueName, Queue> {
  const out: Partial<Record<QueueName, Queue>> = {};
  for (const name of ALL_QUEUE_NAMES) out[name] = getQueue(name);
  return out as Record<QueueName, Queue>;
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map(q => q.close()));
  queues.clear();
}

export async function getQueueDepths(): Promise<Record<QueueName, {
  waiting: number; active: number; completed: number; failed: number; delayed: number;
}>> {
  const out: Record<string, any> = {};
  for (const name of ALL_QUEUE_NAMES) {
    const q = getQueue(name);
    const counts = await q.getJobCounts('waiting','active','completed','failed','delayed');
    out[name] = {
      waiting:   counts.waiting   ?? 0,
      active:    counts.active    ?? 0,
      completed: counts.completed ?? 0,
      failed:    counts.failed    ?? 0,
      delayed:   counts.delayed   ?? 0,
    };
  }
  return out as any;
}
