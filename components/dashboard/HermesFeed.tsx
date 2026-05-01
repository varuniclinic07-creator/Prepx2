'use client';

import { motion } from 'motion/react';
import { BrainCircuit } from 'lucide-react';
import { Pill } from '@/components/ui/Pill';
import { useT } from '@/lib/i18n-client';
import { fadeUp, staggerChildren } from '@/components/MotionPresets';

export interface HermesTaskRow {
  id: string;
  agent_type: string;
  status: string;
  summary: string;
  created_at: string;
}

const STATUS_TONE: Record<string, 'primary' | 'cyan' | 'success' | 'warning' | 'error' | 'muted'> = {
  pending: 'muted',
  queued: 'cyan',
  running: 'primary',
  in_progress: 'primary',
  completed: 'success',
  done: 'success',
  failed: 'error',
  error: 'error',
};

export function HermesFeed({ tasks }: { tasks: HermesTaskRow[] }) {
  const { t } = useT();

  if (!tasks.length) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-4 py-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-primary-500)]/15 text-[var(--color-primary-300)]">
          <BrainCircuit size={18} />
        </div>
        <p className="max-w-xs text-sm text-white/55">{t('dashboard.cards.hermes.empty')}</p>
      </div>
    );
  }

  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={staggerChildren}
      className="space-y-2"
    >
      {tasks.map((task) => (
        <motion.li
          key={task.id}
          variants={fadeUp}
          className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-500)]/15 text-[var(--color-primary-300)]">
            <BrainCircuit size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm text-white/85">{task.summary}</p>
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-white/40">
              <span className="font-medium uppercase tracking-wider">{task.agent_type}</span>
              <span>•</span>
              <span>{new Date(task.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <Pill tone={STATUS_TONE[task.status] ?? 'muted'} className="flex-shrink-0">{task.status}</Pill>
        </motion.li>
      ))}
    </motion.ul>
  );
}
