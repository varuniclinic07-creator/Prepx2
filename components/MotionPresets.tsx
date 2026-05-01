'use client';

/**
 * Single source of truth for motion variants used across PrepX.
 * Keep this small — only patterns referenced from at least 2 callers belong here.
 *
 * Easing curves match the design system tokens in app/globals.css.
 */

import type { Variants } from 'motion/react';

const cinematic = [0.22, 1, 0.36, 1] as const;

/** Fade-up reveal — used for hero copy, dashboard cards, feature pillars. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: cinematic },
  },
};

/** Fade-up with sharper exit, suitable for AnimatePresence wrappers. */
export const fadeUpExit: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: cinematic },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.3, ease: cinematic },
  },
};

/** Stagger a list of children. Use with fadeUp on each child. */
export const staggerChildren: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

/** Pulse glow — for the live-activity dot, primary CTA on dashboard. */
export const glowPulse: Variants = {
  rest: {
    boxShadow: '0 0 12px rgba(43, 89, 240, 0.25)',
    scale: 1,
  },
  pulse: {
    boxShadow: [
      '0 0 12px rgba(43, 89, 240, 0.25)',
      '0 0 28px rgba(43, 89, 240, 0.45)',
      '0 0 12px rgba(43, 89, 240, 0.25)',
    ],
    scale: [1, 1.02, 1],
    transition: {
      duration: 2.4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/** Word-stagger reveal — used for the hero headline. */
export const wordStagger: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
    },
  },
};

export const wordItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: cinematic },
  },
};

/** Scroll-driven reveal viewport defaults — used everywhere. */
export const VIEWPORT_ONCE = { once: true, margin: '-100px' as const };
