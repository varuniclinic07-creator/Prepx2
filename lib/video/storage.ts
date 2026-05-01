import 'server-only';
import { getAdminClient } from '../supabase-admin';

export const VIDEOS_BUCKET = 'videos';
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60; // 24h

export async function uploadRenderedVideo(
  storagePath: string,
  body: Buffer | Uint8Array,
  contentType = 'video/mp4'
): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.storage
    .from(VIDEOS_BUCKET)
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`uploadRenderedVideo: ${error.message}`);
}

export async function mintSignedUrl(storagePath: string, ttlSeconds = SIGNED_URL_TTL_SECONDS):
  Promise<{ url: string; expiresAt: string }> {
  const sb = getAdminClient();
  const { data, error } = await sb.storage
    .from(VIDEOS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`mintSignedUrl: ${error?.message || 'no signed url returned'}`);
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url: data.signedUrl, expiresAt };
}

// Refreshes the signed URL on a video_lectures row if expired or about to expire.
// Returns the (possibly new) URL. Used by the public viewer page.
export async function getOrRefreshLectureUrl(lectureId: string): Promise<string | null> {
  const sb = getAdminClient();
  const { data: lecture } = await sb
    .from('video_lectures')
    .select('storage_path, signed_url, signed_url_expires_at, status')
    .eq('id', lectureId)
    .single();
  if (!lecture || !lecture.storage_path) return null;
  if (lecture.status !== 'published') return null;

  const expiresAt = lecture.signed_url_expires_at ? new Date(lecture.signed_url_expires_at) : null;
  const fresh = expiresAt && expiresAt.getTime() > Date.now() + 60_000; // >1min headroom
  if (fresh && lecture.signed_url) return lecture.signed_url;

  const { url, expiresAt: newExp } = await mintSignedUrl(lecture.storage_path);
  await sb.from('video_lectures').update({
    signed_url: url,
    signed_url_expires_at: newExp,
  }).eq('id', lectureId);
  return url;
}
