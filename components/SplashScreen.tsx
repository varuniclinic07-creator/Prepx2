'use client';

/**
 * PrepX cinematic intro — 3.5s timeline.
 *
 * Renders only on the first visit per session (sessionStorage flag set at
 * mount time). Honors prefers-reduced-motion: collapses to a 600ms cross-fade.
 *
 * India-themed: tricolor particle field (saffron / white / green), Ashoka
 * Chakra spinning subtly behind the wordmark, bilingual rotating tagline.
 *
 * Layered:
 *  - Tricolor blob layer (slow drift, multiply blend)
 *  - Particle field (24 small dots, randomized but deterministic seed)
 *  - Ashoka chakra silhouette (slow rotation behind brand)
 *  - Brand wordmark (character stagger)
 *  - Tagline rotator (en + hi, 3 lines, 1.1s each)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { Lang } from '@/lib/i18n';
import { t } from '@/lib/i18n';

const SESSION_FLAG = 'prepx-splash-shown';

// Particle field — deterministic so SSR/CSR markup matches.
const PARTICLES = Array.from({ length: 24 }, (_, i) => {
  const angle = (i / 24) * Math.PI * 2;
  const radius = 25 + (i % 5) * 8;
  return {
    left: 50 + Math.cos(angle) * radius,
    top: 50 + Math.sin(angle) * radius * 0.7,
    size: 2 + (i % 4),
    delay: (i % 8) * 0.15,
    color: i % 3 === 0 ? '#FF9933' : i % 3 === 1 ? '#FFFFFF' : '#138808',
    duration: 5 + (i % 5) * 0.6,
  };
});

const cinematic = [0.22, 1, 0.36, 1] as const;

export interface SplashScreenProps {
  /** Caller can pass the SSR-resolved lang so initial paint is correct. */
  initialLang?: Lang;
  onComplete: () => void;
}

export function SplashScreen({ initialLang = 'en', onComplete }: SplashScreenProps) {
  const reduced = useReducedMotion();
  const [taglineIndex, setTaglineIndex] = useState(0);
  const completedRef = useRef(false);

  const taglines = useMemo(
    () => [
      { lang: initialLang, key: 'splash.tagline.1' },
      { lang: initialLang === 'en' ? ('hi' as Lang) : ('en' as Lang), key: 'splash.tagline.2' },
      { lang: initialLang, key: 'splash.tagline.3' },
    ],
    [initialLang]
  );

  // Rotate tagline lines.
  useEffect(() => {
    if (reduced) return;
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % taglines.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [reduced, taglines.length]);

  // Auto-dismiss.
  useEffect(() => {
    if (completedRef.current) return;
    const duration = reduced ? 600 : 3500;
    const id = setTimeout(() => {
      completedRef.current = true;
      onComplete();
    }, duration);
    return () => clearTimeout(id);
  }, [reduced, onComplete]);

  if (reduced) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.4 } }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-[var(--color-surface-0)]"
      >
        <div className="text-2xl font-semibold tracking-tight text-white">
          Prep<span className="text-[var(--color-accent-saffron)]">X</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)', transition: { duration: 0.9, ease: cinematic } }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden bg-[var(--color-surface-0)]"
      role="dialog"
      aria-label="PrepX intro"
    >
      {/* ─── Tricolor ambient blobs ────────────────────────────────── */}
      <motion.div
        animate={{ x: [0, 24, 0], y: [0, -16, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[8%] top-[18%] h-[55vh] w-[55vh] rounded-full bg-[#FF9933]/15 blur-[120px] mix-blend-screen"
        aria-hidden
      />
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.55, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[35%] top-[30%] h-[45vh] w-[45vh] rounded-full bg-white/10 blur-[120px] mix-blend-screen"
        aria-hidden
      />
      <motion.div
        animate={{ x: [0, -22, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[10%] bottom-[12%] h-[55vh] w-[55vh] rounded-full bg-[#138808]/15 blur-[120px] mix-blend-screen"
        aria-hidden
      />

      {/* ─── Subtle grid (cinematic noise) ─────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 bg-[size:64px_64px] opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
        }}
        aria-hidden
      />

      {/* ─── Tricolor particle field ───────────────────────────────── */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 0, scale: 0.6 }}
          animate={{ opacity: [0, 0.6, 0], y: -120, scale: [0.6, 1, 0.4] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'linear', repeat: Infinity }}
          className="absolute rounded-full blur-[1px]"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 8px ${p.color}`,
          }}
          aria-hidden
        />
      ))}

      {/* ─── Ashoka Chakra silhouette ──────────────────────────────── */}
      <motion.svg
        viewBox="0 0 200 200"
        initial={{ opacity: 0, rotate: 0, scale: 0.9 }}
        animate={{ opacity: 0.18, rotate: 360, scale: 1 }}
        transition={{ rotate: { duration: 24, repeat: Infinity, ease: 'linear' }, opacity: { duration: 1.2 } }}
        className="absolute h-[58vmin] w-[58vmin]"
        aria-hidden
      >
        <circle cx="100" cy="100" r="78" stroke="#1E40AF" strokeWidth="2" fill="none" />
        <circle cx="100" cy="100" r="20" stroke="#1E40AF" strokeWidth="1.5" fill="none" />
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i / 24) * 360;
          return (
            <line
              key={i}
              x1="100"
              y1="22"
              x2="100"
              y2="100"
              stroke="#1E40AF"
              strokeWidth="1"
              transform={`rotate(${angle} 100 100)`}
              opacity={0.7}
            />
          );
        })}
      </motion.svg>

      {/* ─── Brand wordmark (character stagger) ─────────────────────── */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 px-6 text-center"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } },
        }}
      >
        <motion.h1
          className="font-display text-[14vw] font-bold tracking-tight text-white drop-shadow-[0_0_40px_rgba(43,89,240,0.45)] sm:text-7xl md:text-8xl"
          variants={{
            hidden: { opacity: 0, y: 20, filter: 'blur(16px)' },
            show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.4, ease: cinematic } },
          }}
        >
          Prep<span className="text-[var(--color-accent-saffron)]">X</span>
        </motion.h1>

        <motion.div
          className="h-[1px] w-16 bg-gradient-to-r from-transparent via-white/70 to-transparent"
          variants={{
            hidden: { opacity: 0, scaleX: 0 },
            show: { opacity: 1, scaleX: 1, transition: { duration: 0.9, ease: cinematic } },
          }}
        />

        <div className="relative h-7 w-full max-w-md overflow-hidden">
          {taglines.map((line, i) => (
            <motion.p
              key={i}
              lang={line.lang}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: i === taglineIndex ? 0.85 : 0,
                y: i === taglineIndex ? 0 : i < taglineIndex ? -12 : 12,
              }}
              transition={{ duration: 0.5, ease: cinematic }}
              className="absolute inset-0 text-center text-sm font-medium tracking-wide text-white/85 sm:text-base"
            >
              {t(line.key, line.lang)}
            </motion.p>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Read-once gate — true on first visit per session, false thereafter. */
export function useShouldShowSplash(): [boolean, () => void] {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const seen = window.sessionStorage.getItem(SESSION_FLAG);
      if (!seen) setShow(true);
    } catch {
      // private mode etc. — never show splash twice if we can't track it
    }
  }, []);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
      // ignore
    }
    setShow(false);
  };

  return [show, dismiss];
}
