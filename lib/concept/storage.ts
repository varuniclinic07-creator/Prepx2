// Sprint 9-B — concepts-mvp bucket helpers. Mirrors lib/lecture/storage.ts
// with the {userId}/{conceptId}/ layout + a 'sources/' staging area for raw
// uploads.

import { readFileSync } from 'fs';
import { getAdminClient } from '../supabase-admin';

export const CONCEPTS_MVP_BUCKET = 'concepts-mvp';
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

export interface ConceptAssetUpload {
  filePath: string;
  storageName: string;
  contentType: string;
}

export interface ConceptUploadResult {
  storagePath: string;
  signedUrl: string;
  expiresAt: string;
  bytes: number;
}

function conceptPrefix(userId: string, conceptId: string): string {
  return `${userId}/${conceptId}`;
}

export async function uploadConceptAsset(
  userId: string,
  conceptId: string,
  storageName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ storagePath: string }> {
  const sb = getAdminClient();
  const storagePath = `${conceptPrefix(userId, conceptId)}/${storageName}`;
  const { error } = await sb.storage
    .from(CONCEPTS_MVP_BUCKET)
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`uploadConceptAsset(${storageName}): ${error.message}`);
  return { storagePath };
}

export async function uploadConceptSource(
  userId: string,
  conceptId: string,
  ext: string,
  body: Buffer,
  contentType: string
): Promise<{ storagePath: string }> {
  const sb = getAdminClient();
  const storagePath = `${userId}/sources/${conceptId}.${ext}`;
  const { error } = await sb.storage
    .from(CONCEPTS_MVP_BUCKET)
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`uploadConceptSource(${storagePath}): ${error.message}`);
  return { storagePath };
}

export async function mintConceptSignedUrl(
  storagePath: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<{ url: string; expiresAt: string }> {
  const sb = getAdminClient();
  const { data, error } = await sb.storage
    .from(CONCEPTS_MVP_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`mintConceptSignedUrl: ${error?.message || 'no signed url returned'}`);
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url: data.signedUrl, expiresAt };
}

export async function uploadConceptBundle(
  userId: string,
  conceptId: string,
  uploads: ConceptAssetUpload[],
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<Record<string, ConceptUploadResult>> {
  const out: Record<string, ConceptUploadResult> = {};
  for (const u of uploads) {
    const buf = readFileSync(u.filePath);
    const { storagePath } = await uploadConceptAsset(userId, conceptId, u.storageName, buf, u.contentType);
    const { url, expiresAt } = await mintConceptSignedUrl(storagePath, ttlSeconds);
    out[u.storageName] = { storagePath, signedUrl: url, expiresAt, bytes: buf.length };
  }
  return out;
}

// Sprint 9-C slice-2 — same RendererArtifact shape as the lecture manifest.
// Concept jobs that opt into Remotion via payload.useRemotion get a parallel
// `explainer-remotion.mp4` artifact + a `renderers.remotion` block.
export interface ConceptRendererArtifact {
  path: string;
  bytes: number;
  render_time_ms?: number;
  frames_rendered?: number;
  fps?: number;
  composition?: string;
}

export interface ConceptManifest {
  conceptId: string;
  topic: string;
  durationSeconds: number;
  generatedAt: string;
  storagePrefix: string;
  signedUrls: {
    explainer: string;                 // canonical ffmpeg explainer.mp4
    explainerRemotion?: string;        // optional Remotion explainer-remotion.mp4
    notesJson: string;
    notesPdf: string;
    quiz: string;
    recap: string;
    timeline: string;
    metadata: string;
    manifest: string;
    narrationMp3?: string;
    subtitles?: string;
  };
  renderers: {
    ffmpeg: ConceptRendererArtifact;
    remotion?: ConceptRendererArtifact;
  };
  expiresAt: string;
}

export function buildConceptManifest(args: {
  conceptId: string;
  topic: string;
  durationSeconds: number;
  storagePrefix: string;
  uploads: Record<string, ConceptUploadResult>;
  remotionMetrics?: {
    render_time_ms: number;
    frames_rendered: number;
    fps: number;
    composition?: string;
  };
}): ConceptManifest {
  const u = args.uploads;
  const pick = (k: string) => u[k]?.signedUrl;
  const ffmpegEntry = u['explainer.mp4'];
  const remotionEntry = u['explainer-remotion.mp4'];
  return {
    conceptId: args.conceptId,
    topic: args.topic,
    durationSeconds: args.durationSeconds,
    generatedAt: new Date().toISOString(),
    storagePrefix: args.storagePrefix,
    signedUrls: {
      explainer:  pick('explainer.mp4')!,
      ...(remotionEntry ? { explainerRemotion: pick('explainer-remotion.mp4')! } : {}),
      notesJson:  pick('notes.json')!,
      notesPdf:   pick('notes.pdf')!,
      quiz:       pick('quiz.json')!,
      recap:      pick('recap.json')!,
      timeline:   pick('timeline.json')!,
      metadata:   pick('metadata.json')!,
      manifest:   pick('manifest.json')!,
      ...(pick('narration.mp3') ? { narrationMp3: pick('narration.mp3') } : {}),
      ...(pick('subtitles.srt') ? { subtitles:   pick('subtitles.srt') } : {}),
    },
    renderers: {
      ffmpeg: {
        path: ffmpegEntry?.storagePath || '',
        bytes: ffmpegEntry?.bytes || 0,
      },
      ...(remotionEntry ? {
        remotion: {
          path: remotionEntry.storagePath,
          bytes: remotionEntry.bytes,
          ...(args.remotionMetrics ? {
            render_time_ms: args.remotionMetrics.render_time_ms,
            frames_rendered: args.remotionMetrics.frames_rendered,
            fps: args.remotionMetrics.fps,
            composition: args.remotionMetrics.composition || 'EducationalLecture',
          } : {}),
        },
      } : {}),
    },
    expiresAt: Object.values(u)[0]?.expiresAt || new Date(Date.now() + 86_400_000).toISOString(),
  };
}
