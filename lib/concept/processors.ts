// Sprint 9-B — concept-generate processor.
//
// Pipeline:
//   1. parsing      — fetch source from concepts-mvp/{userId}/sources/* (or rawText) → text
//   2. extracting   — aiChat → topic + concepts + formulas + confusions + objectives
//   3. simplifying  — aiChat → teacher-style script + LECTURE_PLAN
//   4. planning     — write planJson + final concept_id
//   5. lecture-generating — call generateLecture(plan) → bake MP4 + notes + quiz
//   6. finalizing   — upload to concepts-mvp/{userId}/{conceptId}/*, build manifest
//   7. completed    — flip row, return signed URLs

import type { Job } from 'bullmq';
import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { getAdminClient } from '../supabase-admin';
import type { ConceptGenerateJobPayload, ConceptStage } from '../queue/types';
import { parseDocument } from './parser';
import { extractConcepts } from './extractor';
import { simplifyToScript, buildPlanFromScript } from './simplifier';
import { generateLecture } from '../lecture/orchestrator';
import {
  uploadConceptBundle,
  buildConceptManifest,
  CONCEPTS_MVP_BUCKET,
  type ConceptAssetUpload,
} from './storage';

const STAGE_PERCENT: Record<ConceptStage, number> = {
  'queued':              0,
  'parsing':             10,
  'extracting':          25,
  'simplifying':         40,
  'planning':            50,
  'lecture-generating':  85,
  'finalizing':          95,
  'completed':           100,
  'failed':              0,
};

function computeCacheHash(args: {
  sourceText: string;
  style?: string;
  difficulty?: string;
  language?: string;
}): string {
  const norm = JSON.stringify({
    text: args.sourceText.replace(/\s+/g, ' ').toLowerCase().slice(0, 8000).trim(),
    style: args.style || 'classroom',
    difficulty: args.difficulty || 'beginner',
    language: args.language || 'en',
  });
  return createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

function buildConceptId(topicSlug: string, cacheHash: string): string {
  const slug = topicSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'concept';
  return `cpt_${slug}_${cacheHash.slice(0, 8)}_${Date.now()}`;
}

async function pushStage(
  jobId: string,
  stage: ConceptStage,
  status: 'started' | 'completed' | 'failed',
  elapsedMs?: number,
  note?: string
) {
  const sb = getAdminClient();
  const entry = {
    stage, status,
    ts: new Date().toISOString(),
    ...(elapsedMs !== undefined ? { elapsed_ms: elapsedMs } : {}),
    ...(note ? { note } : {}),
  };
  const { data: row } = await sb.from('concept_jobs').select('stage_log').eq('id', jobId).single();
  const log = Array.isArray(row?.stage_log) ? row!.stage_log : [];
  log.push(entry);
  const updates: Record<string, any> = {
    stage_log: log,
    status: stage,
    progress_percent: STAGE_PERCENT[stage] ?? 0,
  };
  if (note && status === 'failed') updates.error_text = note;
  await sb.from('concept_jobs').update(updates).eq('id', jobId);
}

// Sprint 9-C Phase B — append a nested LectureStage event under the parent
// 'lecture-generating' concept stage. We do NOT bump concept_jobs.status here
// (it stays at 'lecture-generating' for the whole sub-pipeline) but we DO
// interpolate progress_percent between the parent's 50% (planning done) and
// 85% (lecture-generating done) so UIs see a moving bar instead of a freeze.
const LECTURE_SUB_PROGRESS: Record<string, number> = {
  'pedagogy':       54,
  'shot-planning':  57,
  'ltx-render':     65,
  'manim-render':   70,
  'narration':      74,
  'subtitles':      77,
  'composition':    79,
  'notes':          81,
  'quiz':           83,
  'finalizing':     84,
};

async function pushLectureSubStage(
  jobId: string,
  evt: { stage: string; rawStageName: string; status: 'started' | 'completed' | 'cached' | 'failed'; elapsedMs?: number }
) {
  const sb = getAdminClient();
  const entry = {
    parent_stage: 'lecture-generating' as ConceptStage,
    sub_stage: evt.stage,
    raw: evt.rawStageName,
    status: evt.status,
    ts: new Date().toISOString(),
    ...(evt.elapsedMs !== undefined ? { elapsed_ms: evt.elapsedMs } : {}),
  };
  const { data: row } = await sb.from('concept_jobs').select('stage_log').eq('id', jobId).single();
  const log = Array.isArray(row?.stage_log) ? row!.stage_log : [];
  log.push(entry);
  // Only nudge progress on 'completed' events so we don't oscillate.
  const updates: Record<string, any> = { stage_log: log };
  if (evt.status === 'completed' || evt.status === 'cached') {
    const pct = LECTURE_SUB_PROGRESS[evt.stage];
    if (pct) updates.progress_percent = pct;
  }
  await sb.from('concept_jobs').update(updates).eq('id', jobId);
}

async function fetchSourceBuffer(storagePath: string): Promise<Buffer> {
  const sb = getAdminClient();
  const { data, error } = await sb.storage.from(CONCEPTS_MVP_BUCKET).download(storagePath);
  if (error || !data) throw new Error(`fetchSourceBuffer(${storagePath}): ${error?.message || 'no data'}`);
  const arr = await data.arrayBuffer();
  return Buffer.from(arr);
}

export async function processConceptGenerateJob(
  job: Job,
  taskId: string
): Promise<Record<string, any>> {
  const data = job.data as ConceptGenerateJobPayload;
  const sb = getAdminClient();
  const { jobId, userId, conceptId: provisionalConceptId, documentType } = data;

  if (!jobId || !userId || !documentType) {
    throw new Error(`concept-generate payload missing required fields (jobId/userId/documentType)`);
  }

  // ── 1. Parsing ──────────────────────────────────────────────────────────
  await pushStage(jobId, 'parsing', 'started');
  const t1 = Date.now();
  let parsedText: string;
  if (documentType === 'text') {
    if (!data.rawText) throw new Error('concept-generate: rawText required for documentType=text');
    const parsed = await parseDocument('text', { text: data.rawText });
    parsedText = parsed.text;
  } else {
    if (!data.sourceStoragePath) throw new Error('concept-generate: sourceStoragePath required for non-text uploads');
    const buf = await fetchSourceBuffer(data.sourceStoragePath);
    const parsed = await parseDocument(documentType, { buffer: buf });
    parsedText = parsed.text;
  }
  if (!parsedText || parsedText.length < 30) {
    throw new Error(`concept-generate: parsed text too short (${parsedText.length} chars) — unusable source`);
  }
  await sb.from('concept_jobs').update({
    source_text_excerpt: parsedText.slice(0, 2000),
  }).eq('id', jobId);
  await pushStage(jobId, 'parsing', 'completed', Date.now() - t1);

  // ── 2. Extracting ───────────────────────────────────────────────────────
  await pushStage(jobId, 'extracting', 'started');
  const t2 = Date.now();
  const extraction = await extractConcepts(parsedText);
  await sb.from('concept_jobs').update({
    detected_topic: extraction.topic,
    detected_concepts: extraction.concepts,
  }).eq('id', jobId);
  await pushStage(jobId, 'extracting', 'completed', Date.now() - t2);

  // ── 3. Simplifying ──────────────────────────────────────────────────────
  await pushStage(jobId, 'simplifying', 'started');
  const t3 = Date.now();
  const script = await simplifyToScript(extraction);
  await pushStage(jobId, 'simplifying', 'completed', Date.now() - t3);

  // ── 4. Planning ─────────────────────────────────────────────────────────
  await pushStage(jobId, 'planning', 'started');
  const t4 = Date.now();
  const cacheHash = computeCacheHash({
    sourceText: parsedText,
    style: data.style,
    difficulty: data.difficulty,
    language: data.language,
  });
  const conceptId = provisionalConceptId.startsWith('pending_')
    ? buildConceptId(extraction.topicSlug, cacheHash)
    : provisionalConceptId;
  const storagePrefix = `${userId}/${conceptId}`;
  const plan = buildPlanFromScript({ topicSlug: extraction.topicSlug, script });

  await sb.from('concept_jobs').update({
    concept_id: conceptId,
    cache_hash: cacheHash,
    storage_prefix: storagePrefix,
  }).eq('id', jobId);
  await pushStage(jobId, 'planning', 'completed', Date.now() - t4);

  // ── 5. Lecture-generating ───────────────────────────────────────────────
  await pushStage(jobId, 'lecture-generating', 'started');
  const t5 = Date.now();
  const conceptOutputDir = path.join(tmpdir(), `concept-${conceptId}`);
  mkdirSync(conceptOutputDir, { recursive: true });
  const lectureResult = await generateLecture({
    topic: extraction.topicSlug,
    durationSeconds: script.durationSeconds,
    style: data.style || 'concept-short',
    difficulty: data.difficulty,
    language: data.language,
    outputDir: conceptOutputDir,
    planJson: plan,
    skipLtx: data.skipLtx,
    useRemotion: data.useRemotion,
    onStageProgress: async (e) => {
      // Sprint 9-C Phase B — forward LectureStage events into concept_jobs.stage_log
      // so concept jobs no longer sit at 85% through the entire bake.
      try {
        await pushLectureSubStage(jobId, e);
      } catch {
        // best-effort; never block the orchestrator on logging
      }
    },
  });
  await pushStage(jobId, 'lecture-generating', 'completed', Date.now() - t5);

  // ── 6. Finalizing — upload to concepts-mvp ──────────────────────────────
  await pushStage(jobId, 'finalizing', 'started');
  const t6 = Date.now();

  // Write recap + enriched metadata locally before upload.
  const recapPath = path.join(conceptOutputDir, 'recap.json');
  const recap = {
    topic: extraction.topic,
    summary: extraction.summary,
    learning_objectives: extraction.learningObjectives,
    confusions_addressed: extraction.confusions,
    formulas: extraction.formulas,
    next_steps: [
      `Re-read the source and compare it to the simplified explanation.`,
      `Try the 5-question quiz to check retention.`,
      `Apply the formula(s) to a new worked example.`,
    ],
  };
  writeFileSync(recapPath, JSON.stringify(recap, null, 2), 'utf8');

  // Enriched concept metadata layered on top of the lecture's metadata.json.
  const enrichedMetadata = {
    ...lectureResult.metadata,
    concept: {
      concept_id: conceptId,
      cache_hash: cacheHash,
      detected_topic: extraction.topic,
      detected_concepts: extraction.concepts,
      formulas: extraction.formulas,
      confusions: extraction.confusions,
      difficulty: extraction.difficulty,
      learning_objectives: extraction.learningObjectives,
      source: {
        document_type: documentType,
        document_name: data.documentName || null,
        excerpt_chars: parsedText.length,
      },
      script: {
        title: script.title,
        intro_vo: script.introVo,
        beats: script.beatsScript,
        outro_vo: script.outroVo,
        formula: script.formula,
        formula_unicode: script.formulaUnicode,
        labels: script.labels,
        duration_seconds: script.durationSeconds,
      },
    },
  };
  const enrichedMetadataPath = path.join(conceptOutputDir, 'concept-metadata.json');
  writeFileSync(enrichedMetadataPath, JSON.stringify(enrichedMetadata, null, 2), 'utf8');

  const uploads: ConceptAssetUpload[] = [
    { filePath: lectureResult.artifacts.lectureMp4,    storageName: 'explainer.mp4',  contentType: 'video/mp4' },
    { filePath: lectureResult.artifacts.notesJson,     storageName: 'notes.json',     contentType: 'application/json' },
    { filePath: lectureResult.artifacts.notesPdf,      storageName: 'notes.pdf',      contentType: 'application/pdf' },
    { filePath: lectureResult.artifacts.quizJson,      storageName: 'quiz.json',      contentType: 'application/json' },
    { filePath: lectureResult.artifacts.timelineJson,  storageName: 'timeline.json',  contentType: 'application/json' },
    { filePath: enrichedMetadataPath,                  storageName: 'metadata.json',  contentType: 'application/json' },
    { filePath: recapPath,                             storageName: 'recap.json',     contentType: 'application/json' },
    { filePath: lectureResult.artifacts.narrationMp3,  storageName: 'narration.mp3',  contentType: 'audio/mpeg' },
    { filePath: lectureResult.artifacts.subtitlesSrt,  storageName: 'subtitles.srt',  contentType: 'application/x-subrip' },
  ];
  // Sprint 9-C slice-2 — opt-in Remotion parallel artifact for concepts.
  if (lectureResult.artifacts.lectureRemotionMp4) {
    uploads.push({
      filePath: lectureResult.artifacts.lectureRemotionMp4,
      storageName: 'explainer-remotion.mp4',
      contentType: 'video/mp4',
    });
  }
  const uploaded = await uploadConceptBundle(userId, conceptId, uploads);

  // Build + upload manifest.
  const manifestStub = buildConceptManifest({
    conceptId,
    topic: extraction.topic,
    durationSeconds: lectureResult.durationSeconds,
    storagePrefix,
    uploads: { ...uploaded, 'manifest.json': { storagePath: '', signedUrl: '', expiresAt: '', bytes: 0 } },
    remotionMetrics: lectureResult.remotionMetrics,
  });
  const manifestLocal = path.join(conceptOutputDir, 'manifest.json');
  writeFileSync(manifestLocal, JSON.stringify(manifestStub, null, 2), 'utf8');
  const manifestUpload = await uploadConceptBundle(userId, conceptId, [
    { filePath: manifestLocal, storageName: 'manifest.json', contentType: 'application/json' },
  ]);
  uploaded['manifest.json'] = manifestUpload['manifest.json'];
  const manifest = buildConceptManifest({
    conceptId,
    topic: extraction.topic,
    durationSeconds: lectureResult.durationSeconds,
    storagePrefix,
    uploads: uploaded,
    remotionMetrics: lectureResult.remotionMetrics,
  });

  await sb.from('concept_jobs').update({
    manifest,
    metadata: enrichedMetadata.concept,
    status: 'completed',
    progress_percent: 100,
    completed_at: new Date().toISOString(),
  }).eq('id', jobId);

  await pushStage(jobId, 'finalizing', 'completed', Date.now() - t6);
  await pushStage(jobId, 'completed', 'completed');

  return {
    taskId,
    jobId,
    conceptId,
    storagePrefix,
    detectedTopic: extraction.topic,
    durationSeconds: lectureResult.durationSeconds,
    signedUrls: manifest.signedUrls,
  };
}
