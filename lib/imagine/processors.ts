import 'server-only';
import type { Job } from 'bullmq';

// Sprint 3 / S3-2 processor — Topic-Imagination Videos.

export async function processImagineJob(_job: Job, _taskId: string): Promise<Record<string, any>> {
  throw new Error('imagine processor not yet implemented (S3-2 agent owns this file)');
}
