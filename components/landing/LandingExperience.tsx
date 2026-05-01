'use client';

import { AnimatePresence, motion } from 'motion/react';
import { SplashScreen, useShouldShowSplash } from '@/components/SplashScreen';
import { MarketingNav } from '@/components/nav/MarketingNav';
import { Hero, type HeroLiveData } from './Hero';
import { FeaturePillars } from './FeaturePillars';
import { BottomCTA } from './BottomCTA';
import { LandingFooter } from './LandingFooter';
import { useT } from '@/lib/i18n-client';

/**
 * Client wrapper for the marketing landing. Owns:
 *  - Splash screen (first-visit-per-session)
 *  - Marketing nav
 *  - Hero + feature pillars + bottom CTA + footer
 *
 * The Server Component (app/page.tsx) is responsible for:
 *  - Authenticated redirect to /dashboard
 *  - Fetching live counters + Hermes activity from Supabase
 */
export function LandingExperience({ data }: { data: HeroLiveData }) {
  const { lang } = useT();
  const [showSplash, dismissSplash] = useShouldShowSplash();

  return (
    <main className="min-h-screen bg-[var(--color-surface-0)] text-white">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" initialLang={lang} onComplete={dismissSplash} />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <MarketingNav />
            <Hero data={data} />
            <FeaturePillars />
            <BottomCTA />
            <LandingFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
