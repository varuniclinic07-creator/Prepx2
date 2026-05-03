// Mirrors lib/video/storage.ts. Uploads rendered MP3s to the private
// `podcasts` bucket and refreshes signed URLs lazily on read so the
// dashboard doesn't store a stale link.

import { getAdminClient } from '../supabase-admin';

export const PODCASTS_BUCKET = 'podcasts';
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

export async function uploadPodcastAudio(
  storagePath: string,
  body: Buffer | Uint8Array,
  contentType = 'audio/mpeg'
): Promise<void> {
  const sb = getAdminClient();
  const { error } = await sb.storage
    .from(PODCASTS_BUCKET)
    .upload(storagePath, body, { contentType, upsert: true });
  if (error) throw new Error(`uploadPodcastAudio: ${error.message}`);
}

export async function mintPodcastSignedUrl(
  storagePath: string,
  ttlSeconds = SIGNED_URL_TTL_SECONDS
): Promise<{ url: string; expiresAt: string }> {
  const sb = getAdminClient();
  const { data, error } = await sb.storage
    .from(PODCASTS_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw new Error(`mintPodcastSignedUrl: ${error?.message || 'no signed url returned'}`);
  }
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { url: data.signedUrl, expiresAt };
}

export async function getOrRefreshEpisodeUrl(episodeId: string): Promise<string | null> {
  const sb = getAdminClient();
  const { data: ep } = await sb
    .from('podcast_episodes')
    .select('audio_path, audio_url, signed_url_expires_at, status')
    .eq('id', episodeId)
    .single();
  if (!ep || !ep.audio_path) return ep?.audio_url ?? null;
  if (ep.status !== 'completed') return null;

  const expiresAt = ep.signed_url_expires_at ? new Date(ep.signed_url_expires_at) : null;
  const fresh = expiresAt && expiresAt.getTime() > Date.now() + 60_000;
  if (fresh && ep.audio_url) return ep.audio_url;

  const { url, expiresAt: newExp } = await mintPodcastSignedUrl(ep.audio_path);
  await sb.from('podcast_episodes').update({
    audio_url: url,
    signed_url_expires_at: newExp,
  }).eq('id', episodeId);
  return url;
}
