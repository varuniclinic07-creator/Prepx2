/**
 * Minimal EN/HI bilingual scaffold for PrepX.
 *
 * - SSR reads the `prepx-lang` cookie (default 'en').
 * - Client persists in localStorage + cookie via `setLang()`.
 * - `t(key, lang)` is the cheap server-side helper — server components pass
 *   in the lang they got from cookies; client components use `useT()`.
 *
 * Deliberately no external lib (next-intl etc.) so other batches in this
 * sprint aren't blocked on a peer-dep dance.
 */

import en from '@/lib/dictionaries/dict.en.json';
import hi from '@/lib/dictionaries/dict.hi.json';

export type Lang = 'en' | 'hi';

const DICTS: Record<Lang, Record<string, string>> = {
  en: en as Record<string, string>,
  hi: hi as Record<string, string>,
};

export const LANGS: Lang[] = ['en', 'hi'];
export const DEFAULT_LANG: Lang = 'en';
export const LANG_COOKIE = 'prepx-lang';
export const LANG_STORAGE_KEY = 'prepx-lang';

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'hi';
}

export function normalizeLang(value: unknown): Lang {
  return isLang(value) ? value : DEFAULT_LANG;
}

/** Server- and client-safe translator. Falls back to EN, then to the key itself. */
export function t(key: string, lang: Lang = DEFAULT_LANG): string {
  return DICTS[lang][key] ?? DICTS.en[key] ?? key;
}

/** Read lang from request cookies on the server. */
export async function getServerLang(): Promise<Lang> {
  // Lazy import keeps this file usable from the client bundle without pulling
  // `next/headers` (which would refuse to render on the client).
  const { cookies } = await import('next/headers');
  const store = await cookies();
  return normalizeLang(store.get(LANG_COOKIE)?.value);
}
