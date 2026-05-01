'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n-client';

export function LandingFooter() {
  const { t, lang } = useT();
  return (
    <footer className="border-t border-white/5 bg-[var(--color-surface-0)] px-4 pb-10 pt-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-[var(--color-accent-cyan-400)] shadow-[var(--shadow-glow-primary-sm)]">
          <span className="text-sm font-bold text-white">PX</span>
        </div>
        <p lang={lang} className="max-w-md text-sm text-white/55">
          {t('footer.tagline')}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-white/40">
          <Link href="/privacy" className="hover:text-white">{t('footer.privacy')}</Link>
          <Link href="/terms" className="hover:text-white">{t('footer.terms')}</Link>
          <Link href="/manifesto" className="hover:text-white">{t('footer.manifesto')}</Link>
        </div>

        <p className="text-[11px] uppercase tracking-[0.2em] text-white/30">{t('footer.copyright')}</p>
      </div>
    </footer>
  );
}
