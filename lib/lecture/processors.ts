// Sprint 9-A — lecture-generate processor.
//
// Wraps the canonical orchestrator (lib/lecture/orchestrator.ts → wrapped
// scripts/verification/mvp-e2e-lecture.ts) and reports stage progress into
// lecture_jobs. On success uploads outputs/mvp/* to {userId}/{lectureId}/* in
// the lectures-mvp bucket and writes manifest.json + metadata.json.

import type { Job } from 'bullmq';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import path from 'path';
import { getAdminClient } from '../supabase-admin';
import type { LectureGenerateJobPayload, LectureStage } from '../queue/types';
import { generateLecture } from './orchestrator';
import {
  uploadLectureBundle,
  buildManifest,
  type LectureAssetUpload,
} from './storage';

const STAGE_PERCENT: Record<LectureStage, number> = {
  'queued':         0,
  'pedagogy':       5,
  'shot-planning':  10,
  'ltx-render':     30,
  'manim-render':   50,
  'narration':      65,
  'subtitles':      75,
  'composition':    80,
  'notes':          88,
  'quiz':           93,
  'finalizing':     97,
  'completed':      100,
  'failed':         0,
};

export function computeCacheHash(args: {
  topic: string;
  durationSeconds?: number;
  style?: string;
  difficulty?: string;
  language?: string;
}): string {
  const norm = JSON.stringify({
    topic: args.topic.toLowerCase().trim(),
    duration: args.durationSeconds || 35,
    style: args.style || 'classroom',
    difficulty: args.difficulty || 'beginner',
    language: args.language || 'en',
  });
  return createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

export function buildLectureId(topic: string, cacheHash: string): string {
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'lecture';
  const shortHash = cacheHash.slice(0, 8);
  return `lec_${slug}_${shortHash}_${Date.now()}`;
}

async function pushStageLog(
  jobId: string,
  stage: LectureStage,
  status: 'started' | 'completed' | 'cached' | 'failed',
  elapsedMs?: number,
  note?: string
) {
  const sb = getAdminClient();
  const entry = {
    stage,
    status,
    ts: new Date().toISOString(),
    ...(elapsedMs !== undefined ? { elapsed_ms: elapsedMs } : {}),
    ...(note ? { note } : {}),
  };
  // Append to stage_log and bump status. We RMW because Postgres JSONB array
  // append on the same row from a single worker is safe (concurrency=1).
  const { data: row } = await sb
    .from('lecture_jobs')
    .select('stage_log')
    .eq('id', jobId)
    .single();
  const log = Array.isArray(row?.stage_log) ? row!.stage_log : [];
  log.push(entry);
  const updates: Record<string, any> = {
    stage_log: log,
    status: stage,
    progress_percent: STAGE_PERCENT[stage] ?? 0,
  };
  if (note) updates.error_text = note;
  await sb.from('lecture_jobs').update(updates).eq('id', jobId);
}

export async function processLectureGenerateJob(
  job: Job,
  taskId: string
): Promise<Record<string, any>> {
  const data = job.data as LectureGenerateJobPayload;
  const sb = getAdminClient();
  const { jobId, userId, topic } = data;

  if (!jobId || !userId || !topic) {
    throw new Error(`lecture-generate payload missing required fields (jobId/userId/topic)`);
  }

  const cacheHash = computeCacheHash({
    topic,
    durationSeconds: data.durationSeconds,
    style: data.style,
    difficulty: data.difficulty,
    language: data.language,
  });
  const lectureId = buildLectureId(topic, cacheHash);
  const storagePrefix = `${userId}/${lectureId}`;

  // Stamp the row with cache + lecture identifiers.
  await sb.from('lecture_jobs').update({
    cache_hash: cacheHash,
    storage_prefix: storagePrefix,
    status: 'pedagogy',
    progress_percent: STAGE_PERCENT['pedagogy'],
  }).eq('id', jobId);

  // Run the orchestrator. Stage progress streams into lecture_jobs.
  const result = await generateLecture({
    topic,
    durationSeconds: data.durationSeconds,
    style: data.style,
    difficulty: data.difficulty,
    language: data.language,
    skipLtx: data.skipLtx,
    onStageProgress: async (e) => {
      try {
        await pushStageLog(jobId, e.stage, e.status, e.elapsedMs);
      } catch {
        // best-effort; never block the orchestrator on logging
      }
    },
  });

  await pushStageLog(jobId, 'finalizing', 'started');

  // Upload artifacts. Each piece becomes an entry in the manifest.
  const uploads: LectureAssetUpload[] = [
    { filePath: result.artifacts.lectureMp4,      storageName: 'lecture.mp4',    contentType: 'video/mp4' },
    { filePath: result.artifacts.notesJson,       storageName: 'notes.json',     contentType: 'application/json' },
    { filePath: result.artifacts.notesPdf,        storageName: 'notes.pdf',      contentType: 'application/pdf' },
    { filePath: result.artifacts.quizJson,        storageName: 'quiz.json',      contentType: 'application/json' },
    { filePath: result.artifacts.timelineJson,    storageName: 'timeline.json',  contentType: 'application/json' },
    { filePath: result.artifacts.metadataJson,    storageName: 'metadata.json',  contentType: 'application/json' },
    { filePath: result.artifacts.narrationMp3,    storageName: 'narration.mp3', contentType: 'audio/mpeg' },
    { filePath: result.artifacts.subtitlesSrt,    storageName: 'subtitles.srt', contentType: 'application/x-subrip' },
  ];

  // First pass: upload the 8 main assets.
  const uploaded = await uploadLectureBundle(userId, lectureId, uploads);

  // Build the frontend manifest, write it locally, then upload it too so the
  // bundle is self-describing in the bucket.
  const manifestStub = buildManifest({
    lectureId,
    topic,
    durationSeconds: result.durationSeconds,
    storagePrefix,
    uploads: { ...uploaded, 'manifest.json': { storagePath: '', signedUrl: '', expiresAt: '', bytes: 0 } },
  });
  const manifestLocal = path.join(result.outputDir, 'manifest.json');
  writeFileSync(manifestLocal, JSON.stringify(manifestStub, null, 2), 'utf8');
  const manifestUpload = await uploadLectureBundle(userId, lectureId, [
    { filePath: manifestLocal, storageName: 'manifest.json', contentType: 'application/json' },
  ]);
  uploaded['manifest.json'] = manifestUpload['manifest.json'];

  const manifest = buildManifest({
    lectureId,
    topic,
    durationSeconds: result.durationSeconds,
    storagePrefix,
    uploads: uploaded,
  });

  await sb.from('lecture_jobs').update({
    manifest,
    metadata: result.metadata,
    status: 'completed',
    progress_percent: 100,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);

  await pushStageLog(jobId, 'completed', 'completed', result.wallSeconds * 1000);

  return {
    taskId,
    jobId,
    lectureId,
    storagePrefix,
    durationSeconds: result.durationSeconds,
    wallSeconds: result.wallSeconds,
    signedUrls: manifest.signedUrls,
  };
}
