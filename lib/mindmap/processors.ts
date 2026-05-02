import 'server-only';
import type { Job } from 'bullmq';

// Sprint 3 / S3-3 processor — Animated Mindmaps per chapter.

export async function processMindmapJob(_job: Job, _taskId: string): Promise<Record<string, any>> {
  throw new Error('mindmap processor not yet implemented (S3-3 agent owns this file)');
}
