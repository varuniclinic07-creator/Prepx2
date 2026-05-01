'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANG_COOKIE, LANG_STORAGE_KEY, isLang, normalizeLang, t as translate, type Lang } from './i18n';

interface LangContextValue {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: React.ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  // Hydrate from localStorage if a different choice exists (cookie/SSR is the
  // primary source; localStorage just keeps the toggle sticky across browsers
  // that strip cookies aggressively in dev).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (isLang(stored) && stored !== lang) setLangState(stored);
    } catch {
      // localStorage may throw in private mode — ignore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the current lang on <html> for :lang(hi) selectors and
  // assistive tech.
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    const normalized = normalizeLang(next);
    setLangState(normalized);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, normalized);
    } catch {
      // ignore
    }
    // 1-year cookie, lax — middleware/SSR will read this on next nav.
    document.cookie = `${LANG_COOKIE}=${normalized}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const value = useMemo<LangContextValue>(() => ({
    lang,
    setLang,
    t: (key: string) => translate(key, lang),
  }), [lang, setLang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useT(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) {
    // SSR fallback for components rendered outside the provider (rare).
    return {
      lang: 'en',
      setLang: () => undefined,
      t: (key: string) => translate(key, 'en'),
    };
  }
  return ctx;
}
