'use client';

import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { useT } from '@/lib/i18n-client';

function greetingKey(hour: number): string {
  if (hour >= 5 && hour < 12) return 'dashboard.greeting.morning';
  if (hour >= 12 && hour < 17) return 'dashboard.greeting.afternoon';
  if (hour >= 17 && hour < 22) return 'dashboard.greeting.evening';
  return 'dashboard.greeting.night';
}

export function DashboardGreeting({
  name,
  streak,
  planComplete,
  planTotal,
}: {
  name: string;
  streak: number;
  planComplete: number;
  planTotal: number;
}) {
  const { t, lang } = useT();
  const hour = new Date().getHours();
  const greeting = t(greetingKey(hour));
  const aspirant = t('dashboard.greeting.aspirant');
  const subline = t('dashboard.greeting.subline');
  const progress = planTotal > 0 ? Math.round((planComplete / planTotal) * 100) : 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[var(--color-primary-700)]/30 via-[var(--color-secondary-700)]/15 to-[var(--color-surface-100)]/30 p-6 sm:p-8"
    >
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--color-secondary-500)]/10 blur-3xl" aria-hidden />
      <div className="absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-[var(--color-accent-cyan-500)]/10 blur-3xl" aria-hidden />

      <div className="relative z-10 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 lang={lang} className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {greeting}, {name || aspirant}.
          </h1>
          <p lang={lang} className="mt-2 max-w-lg text-sm text-white/60">
            {subline}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-accent-saffron)]/30 bg-[var(--color-accent-saffron)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-accent-saffron)]">
            <Zap size={16} />
            <span>{streak} {t('dashboard.streak')}</span>
          </div>
        </div>
      </div>

      {planTotal > 0 && (
        <div className="relative z-10 mt-6">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-white/45">
            <span>{t('dashboard.plan.title')}</span>
            <span>{planComplete}/{planTotal} {t('dashboard.plan.complete')}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="h-full bg-gradient-to-r from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-[var(--color-accent-cyan-400)]"
            />
          </div>
        </div>
      )}
    </motion.section>
  );
}
