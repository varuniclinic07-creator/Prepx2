'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Activity, BookOpen, Mic, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Pill } from '@/components/ui/Pill';
import { fadeUp, staggerChildren, wordItem, wordStagger, VIEWPORT_ONCE } from '@/components/MotionPresets';
import { useT } from '@/lib/i18n-client';

export interface HeroLiveData {
  aspirants: number;
  topics: number;
  questionsToday: number;
  hermesActivity: Array<{ id: string; agent: string; summary: string; status: string }>;
  todayPlan: Array<{ topic_id: string; type: string; duration: number; status: string }> | null;
  astraPreview: { title: string; subject: string } | null;
}

export function Hero({ data }: { data: HeroLiveData }) {
  const { t, lang } = useT();

  const headlineParts = [t('hero.headline.lead'), t('hero.headline.accent'), t('hero.headline.tail')];

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-20 pt-32 sm:pt-36">
      {/* Ambience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[8%] h-[55vh] w-[55vh] rounded-full bg-[var(--color-primary-700)]/30 blur-[120px]" />
        <div className="absolute right-[5%] top-[24%] h-[45vh] w-[45vh] rounded-full bg-[var(--color-secondary-600)]/20 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[40%] h-[40vh] w-[40vh] rounded-full bg-[var(--color-accent-cyan-600)]/15 blur-[120px]" />
      </div>

      {/* Grid mask */}
      <div
        className="pointer-events-none absolute inset-0 bg-[size:48px_48px] opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          maskImage: 'radial-gradient(ellipse 60% 60% at 50% 40%, #000 10%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 40%, #000 10%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <Pill tone="cyan" className="mb-7">
            <Sparkles size={12} />
            {t('hero.eyebrow')}
          </Pill>
        </motion.div>

        <motion.h1
          initial="hidden"
          animate="show"
          variants={wordStagger}
          lang={lang}
          className="mb-6 max-w-4xl text-balance font-display text-[40px] font-bold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl"
        >
          {headlineParts.map((part, i) => (
            <motion.span key={i} variants={wordItem} className="inline-block">
              {i === 1 ? <span className="text-gradient-nebula">{part}</span> : part}
              {i < headlineParts.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-10 max-w-2xl text-balance text-base font-light leading-relaxed text-white/65 sm:text-lg md:text-xl"
          lang={lang}
        >
          {t('hero.subhead')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link href="/signup" className="w-full sm:w-auto">
            <Button variant="saffron" size="lg" block>
              {t('hero.cta.primary')}
              <ArrowRight size={18} />
            </Button>
          </Link>
          <Link href="/astra" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" block>
              {t('hero.cta.secondary')}
            </Button>
          </Link>
        </motion.div>

        {/* Live counter strip */}
        <motion.dl
          initial="hidden"
          animate="show"
          variants={staggerChildren}
          className="mt-12 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3"
        >
          <LiveStat label={t('hero.live.aspirants')} value={data.aspirants} accent="primary" />
          <LiveStat label={t('hero.live.topics')} value={data.topics} accent="secondary" />
          <LiveStat label={t('hero.live.questions')} value={data.questionsToday} accent="cyan" />
        </motion.dl>

        {/* Glass card cluster — real data, with empty-state messaging never "Coming soon" */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VIEWPORT_ONCE}
          variants={staggerChildren}
          className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <ClusterCard
            icon={<BookOpen size={18} className="text-[var(--color-accent-cyan-400)]" />}
            title={t('hero.cards.astra.title')}
            tone="cyan"
            empty={!data.astraPreview}
            emptyText={t('hero.cards.astra.empty')}
          >
            {data.astraPreview && (
              <>
                <p className="text-sm font-semibold text-white">{data.astraPreview.title}</p>
                <p className="mt-1 text-xs text-white/55">{data.astraPreview.subject}</p>
              </>
            )}
          </ClusterCard>

          <ClusterCard
            icon={<Activity size={18} className="text-[var(--color-primary-300)]" />}
            title={t('hero.cards.hermes.title')}
            tone="primary"
            empty={data.hermesActivity.length === 0}
            emptyText={t('hero.cards.hermes.empty')}
          >
            {data.hermesActivity.length > 0 && (
              <ul className="space-y-1.5 text-left">
                {data.hermesActivity.slice(0, 3).map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-xs text-white/70">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-accent-cyan-400)] shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                    <span className="line-clamp-2">{a.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </ClusterCard>

          <ClusterCard
            icon={<Mic size={18} className="text-[var(--color-secondary-400)]" />}
            title={t('hero.cards.interview.title')}
            tone="secondary"
            empty
            emptyText={t('hero.cards.interview.empty')}
          />

          <ClusterCard
            icon={<Calendar size={18} className="text-[var(--color-accent-saffron)]" />}
            title={t('hero.cards.plan.title')}
            tone="saffron"
            empty={!data.todayPlan || data.todayPlan.length === 0}
            emptyText={t('hero.cards.plan.empty')}
          >
            {data.todayPlan && data.todayPlan.length > 0 && (
              <ul className="space-y-1 text-left text-xs text-white/70">
                {data.todayPlan.slice(0, 3).map((task, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="capitalize">{task.type}</span>
                    <span className="text-white/40">{task.duration} min</span>
                  </li>
                ))}
              </ul>
            )}
          </ClusterCard>
        </motion.div>
      </div>
    </section>
  );
}

function LiveStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'primary' | 'secondary' | 'cyan';
}) {
  const accentClass =
    accent === 'primary'
      ? 'text-[var(--color-primary-300)]'
      : accent === 'secondary'
        ? 'text-[var(--color-secondary-400)]'
        : 'text-[var(--color-accent-cyan-400)]';

  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-4 backdrop-blur-sm">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">{label}</dt>
      <dd className={`mt-1 font-mono text-2xl font-bold tracking-tight ${accentClass}`}>
        {value.toLocaleString('en-IN')}
      </dd>
    </motion.div>
  );
}

function ClusterCard({
  icon,
  title,
  tone,
  empty,
  emptyText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: 'primary' | 'secondary' | 'cyan' | 'saffron';
  empty?: boolean;
  emptyText: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp}>
      <GlassCard glow={tone === 'saffron' ? 'saffron' : tone === 'cyan' ? 'cyan' : tone === 'secondary' ? 'secondary' : 'primary'} interactive padding="sm" className="h-full text-left">
        <div className="mb-3 flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{title}</span>
        </div>
        {empty ? (
          <p className="text-sm leading-relaxed text-white/55">{emptyText}</p>
        ) : (
          children
        )}
      </GlassCard>
    </motion.div>
  );
}
