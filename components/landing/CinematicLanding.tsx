'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import SplashScreen from './SplashScreen';
import CinematicNavbar from './CinematicNavbar';
import CinematicHero from './CinematicHero';
import CinematicFeatures from './CinematicFeatures';
import CinematicFooter from './CinematicFooter';
import type { HeroLiveData } from './types';

export default function CinematicLanding({ data }: { data: HeroLiveData }) {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <main className="bg-[#050505] min-h-screen text-white selection:bg-blue-500/30">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, filter: 'blur(10px)', scale: 0.98 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <CinematicNavbar />
            <CinematicHero data={data} />
            <CinematicFeatures />
            <CinematicFooter />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
