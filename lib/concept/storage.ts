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

export interface ConceptManifest {
  conceptId: string;
  topic: string;
  durationSeconds: number;
  generatedAt: string;
  storagePrefix: string;
  signedUrls: {
    explainer: string;
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
  expiresAt: string;
}

export function buildConceptManifest(args: {
  conceptId: string;
  topic: string;
  durationSeconds: number;
  storagePrefix: string;
  uploads: Record<string, ConceptUploadResult>;
}): ConceptManifest {
  const u = args.uploads;
  const pick = (k: string) => u[k]?.signedUrl;
  return {
    conceptId: args.conceptId,
    topic: args.topic,
    durationSeconds: args.durationSeconds,
    generatedAt: new Date().toISOString(),
    storagePrefix: args.storagePrefix,
    signedUrls: {
      explainer:  pick('explainer.mp4')!,
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
    expiresAt: Object.values(u)[0]?.expiresAt || new Date(Date.now() + 86_400_000).toISOString(),
  };
}
