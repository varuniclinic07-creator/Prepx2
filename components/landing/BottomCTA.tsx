'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fadeUp, VIEWPORT_ONCE } from '@/components/MotionPresets';
import { useT } from '@/lib/i18n-client';

export function BottomCTA() {
  const { t, lang } = useT();

  return (
    <section className="relative px-4 py-24">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VIEWPORT_ONCE}
        variants={fadeUp}
        className="mx-auto max-w-3xl rounded-[28px] border border-[var(--color-accent-saffron)]/30 bg-gradient-to-br from-[var(--color-accent-saffron)]/15 via-[var(--color-primary-700)]/30 to-[var(--color-secondary-700)]/25 p-10 text-center shadow-[var(--shadow-glow-saffron-md)] sm:p-14"
      >
        <h2 lang={lang} className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
          {t('hero.cta.bottom.title')}
        </h2>
        <p lang={lang} className="mx-auto mt-4 max-w-xl text-base text-white/75">
          {t('hero.cta.bottom.body')}
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/signup">
            <Button variant="saffron" size="lg">
              {t('hero.cta.bottom.button')}
              <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
