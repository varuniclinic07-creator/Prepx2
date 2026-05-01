'use client';

import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { useT } from '@/lib/i18n-client';
import { fadeUp, staggerChildren } from '@/components/MotionPresets';

export interface RecentAttempt {
  id: string;
  topic_title: string;
  score: number;
  total: number;
  created_at: string;
}

export function RecentAttempts({ attempts }: { attempts: RecentAttempt[] }) {
  const { t } = useT();

  if (!attempts.length) {
    return (
      <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-3 px-4 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-cyan-500)]/15 text-[var(--color-accent-cyan-400)]">
          <Sparkles size={18} />
        </div>
        <p className="max-w-xs text-sm text-white/55">{t('dashboard.cards.recent.empty')}</p>
      </div>
    );
  }

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={staggerChildren}
      className="divide-y divide-white/5"
    >
      {attempts.map((a) => {
        const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
        const tone = pct >= 80 ? 'success' : pct >= 50 ? 'cyan' : 'warning';
        return (
          <motion.li
            key={a.id}
            variants={fadeUp}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white/85">{a.topic_title}</p>
              <p className="text-[11px] text-white/40">
                {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <Pill tone={tone}>{pct}%</Pill>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
