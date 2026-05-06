// Sprint 9-A — lectures-mvp bucket helpers. Mirrors lib/video/storage.ts shape
// but pinned to the lectures-mvp bucket and the {userId}/{lectureId}/ layout.

import { readFileSync } from 'fs';
import path from 'path';
import { getAdminClient } from '../supabase-admin';

export const LECTURES_MVP_BUCKET = 'lectures-mvp';
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60; // 24h

export interface LectureAssetUpload {
  /** Local absolute path on the worker filesystem. */
  filePath: string;
  /** Filename to store under the lecture prefix (e.g. 'lecture.mp4'). */
  storageName: string;
  contentType: string;
}

export interface LectureUploadResult {
  storagePath: string;       // {userId}/{lectureId}/{storageName}
  signedUrl: string;
  expiresAt: string;
  bytes: number;
}

function lecturePrefix(userId: string, lectureId: string): string {
  return `${userId}/${lectureId}`;
}

export async function uploadLectureAsset(
  userId: string,
  lectureId: string,
  storageName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ storagePath: string }> {
  const sb = getAdminClient();
  const storagePath = `${lecturePrefix(userId, lectureId)}/${storageName}`;
  const { error } = await sb.storage
    .from(LECTURES_MVP_BUCKET)
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`uploadLectureAsset(${storageName}): ${error.message}`);
  return { storagePath };
}

export async function mintLectureSignedUrl(
  storagePath: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<{ url: string; expiresAt: string }> {
  const sb = getAdminClient();
  const { data, error } = await sb.storage
    .from(LECTURES_MVP_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`mintLectureSignedUrl: ${error?.message || 'no signed url returned'}`);
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url: data.signedUrl, expiresAt };
}

export async function uploadLectureBundle(
  userId: string,
  lectureId: string,
  uploads: LectureAssetUpload[],
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<Record<string, LectureUploadResult>> {
  const out: Record<string, LectureUploadResult> = {};
  for (const u of uploads) {
    const buf = readFileSync(u.filePath);
    const { storagePath } = await uploadLectureAsset(userId, lectureId, u.storageName, buf, u.contentType);
    const { url, expiresAt } = await mintLectureSignedUrl(storagePath, ttlSeconds);
    out[u.storageName] = {
      storagePath,
      signedUrl: url,
      expiresAt,
      bytes: buf.length,
    };
  }
  return out;
}

// Content-addressed cache lookup. Returns existing signed URLs if a previous
// run with the same cache_hash already produced an identical asset bundle.
export async function findCachedLecture(cacheHash: string): Promise<Record<string, string> | null> {
  const sb = getAdminClient();
  const { data, error } = await sb
    .from('lecture_jobs')
    .select('storage_prefix, manifest, status')
    .eq('cache_hash', cacheHash)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  const row = data[0];
  if (!row.manifest || !row.storage_prefix) return null;
  return row.manifest.signedUrls || null;
}

export interface LectureManifest {
  lectureId: string;
  topic: string;
  durationSeconds: number;
  generatedAt: string;
  storagePrefix: string;
  signedUrls: {
    video: string;
    notesJson: string;
    notesPdf: string;
    quiz: string;
    timeline: string;
    metadata: string;
    manifest: string;
    narrationMp3?: string;
    subtitles?: string;
  };
  expiresAt: string;
}

export function buildManifest(args: {
  lectureId: string;
  topic: string;
  durationSeconds: number;
  storagePrefix: string;
  uploads: Record<string, LectureUploadResult>;
}): LectureManifest {
  const u = args.uploads;
  const pick = (k: string) => u[k]?.signedUrl;
  return {
    lectureId: args.lectureId,
    topic: args.topic,
    durationSeconds: args.durationSeconds,
    generatedAt: new Date().toISOString(),
    storagePrefix: args.storagePrefix,
    signedUrls: {
      video: pick('lecture.mp4')!,
      notesJson: pick('notes.json')!,
      notesPdf: pick('notes.pdf')!,
      quiz: pick('quiz.json')!,
      timeline: pick('timeline.json')!,
      metadata: pick('metadata.json')!,
      manifest: pick('manifest.json')!,
      ...(pick('narration.mp3') ? { narrationMp3: pick('narration.mp3') } : {}),
      ...(pick('subtitles.srt') ? { subtitles: pick('subtitles.srt') } : {}),
    },
    expiresAt: Object.values(u)[0]?.expiresAt || new Date(Date.now() + 86_400_000).toISOString(),
  };
}
