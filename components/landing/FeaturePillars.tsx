'use client';

import { motion } from 'motion/react';
import { Cuboid, Mic, Video, Library } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { fadeUp, staggerChildren, VIEWPORT_ONCE } from '@/components/MotionPresets';
import { useT } from '@/lib/i18n-client';

export function FeaturePillars() {
  const { t } = useT();

  const pillars = [
    {
      icon: <Cuboid size={24} className="text-[var(--color-primary-300)]" />,
      tone: 'primary' as const,
      title: t('hero.pillars.notes.title'),
      body: t('hero.pillars.notes.body'),
    },
    {
      icon: <Mic size={24} className="text-[var(--color-secondary-400)]" />,
      tone: 'secondary' as const,
      title: t('hero.pillars.interview.title'),
      body: t('hero.pillars.interview.body'),
    },
    {
      icon: <Video size={24} className="text-[var(--color-accent-cyan-400)]" />,
      tone: 'cyan' as const,
      title: t('hero.pillars.video.title'),
      body: t('hero.pillars.video.body'),
    },
    {
      icon: <Library size={24} className="text-[var(--color-accent-saffron)]" />,
      tone: 'saffron' as const,
      title: t('hero.pillars.books.title'),
      body: t('hero.pillars.books.body'),
    },
  ];

  return (
    <section id="features" className="relative px-4 py-24">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT_ONCE}
        variants={staggerChildren}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {pillars.map((p) => (
          <motion.div key={p.title} variants={fadeUp}>
            <GlassCard glow={p.tone} interactive className="h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                {p.icon}
              </div>
              <h3 className="mb-2 text-lg font-bold tracking-tight text-white">{p.title}</h3>
              <p className="text-sm leading-relaxed text-white/60">{p.body}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
