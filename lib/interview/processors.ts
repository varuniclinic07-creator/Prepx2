import 'server-only';
import type { Job } from 'bullmq';

// Sprint 3 / S3-8 processor — Live Interview Panel.

export async function processInterviewJob(_job: Job, _taskId: string): Promise<Record<string, any>> {
  throw new Error('interview processor not yet implemented (S3-8 agent owns this file)');
}
