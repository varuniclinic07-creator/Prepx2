import 'server-only';
import type { Job } from 'bullmq';

// Sprint 3 / S3-1 processor — Mnemonic Engine v2.
// Filled in by the S3-1 specialist agent. The foundation registers this
// in workers/hermes-worker.ts so the queue is bound and BullMQ won't drop
// jobs — until the agent merges the real impl, jobs will record a clear
// "not implemented" failure that the dead-letter handler captures.

export async function processMnemonicJob(_job: Job, _taskId: string): Promise<Record<string, any>> {
  throw new Error('mnemonic processor not yet implemented (S3-1 agent owns this file)');
}
