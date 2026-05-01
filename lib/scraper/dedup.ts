import { createHash } from 'crypto';
import { supabase } from '../supabase';

/**
 * Normalise free text before hashing so trivial whitespace / casing / wrapping
 * differences across re-fetches do not produce a fresh hash.
 *  - strip HTML
 *  - collapse whitespace
 *  - lowercase
 */
export function normalizeForHash(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** sha256 of the normalised text. Stable + deterministic. */
export function computeContentHash(text: string): string {
  return createHash('sha256').update(normalizeForHash(text)).digest('hex');
}

/**
 * Returns true if (sourceId, hash) already exists in research_articles.
 * Uses the anon client; if the caller has a service-role client they can pass it.
 */
export async function isDuplicate(
  sourceId: string,
  hash: string,
  client = supabase
): Promise<boolean> {
  const { data, error } = await client
    .from('research_articles')
    .select('id')
    .eq('source_id', sourceId)
    .eq('content_hash', hash)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows; anything else is unexpected, log loudly.
    console.warn('[dedup] isDuplicate query error', error);
    return false;
  }
  return !!data;
}
