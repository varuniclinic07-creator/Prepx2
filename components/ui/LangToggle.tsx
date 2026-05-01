'use client';

import { useT } from '@/lib/i18n-client';
import type { Lang } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useT();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={cn(
        'inline-flex items-center rounded-full border border-white/10 bg-white/5 p-0.5',
        'text-[12px] font-semibold backdrop-blur-md',
        className
      )}
    >
      {(['en', 'hi'] as Lang[]).map((option) => {
        const active = lang === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLang(option)}
            aria-pressed={active}
            className={cn(
              'rounded-full px-3 py-1 transition-colors',
              active ? 'bg-white text-[var(--color-surface-0)]' : 'text-white/60 hover:text-white'
            )}
          >
            {option === 'en' ? 'EN' : 'हिं'}
          </button>
        );
      })}
    </div>
  );
}
