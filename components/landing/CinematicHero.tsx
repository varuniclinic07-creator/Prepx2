'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Play, CheckCircle2, Zap } from 'lucide-react';
import type { HeroLiveData } from './types';

export default function CinematicHero({ data }: { data: HeroLiveData }) {
  const streakCount = data.hermesActivity.length;

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-4 overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl w-full">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10 mb-8 backdrop-blur-md"
        >
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
          <span className="text-xs font-semibold tracking-wide text-white/80 uppercase">PrepX UPSC OS — Hermes 24/7</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1] max-w-4xl"
        >
          Improve your UPSC answers with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-cyan-200 to-white">
            instant AI feedback.
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-12 font-light leading-relaxed"
        >
          Know exactly where you lose marks — and how to improve every attempt. A 24/7 AI research team, real interview panels, and topic-imagination 3D videos. An Elite Preparation OS for serious aspirants.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          <Link href="/signup" className="w-full sm:w-auto">
            <button className="h-14 px-8 rounded-full bg-white text-black font-semibold text-lg flex items-center justify-center gap-2 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all w-full sm:w-auto">
              Start Improving in 60 Seconds <ArrowRight size={20} />
            </button>
          </Link>

          <Link href="/imagine" className="w-full sm:w-auto">
            <button className="h-14 px-8 rounded-full bg-transparent border border-white/10 text-white font-medium text-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-colors w-full sm:w-auto">
              <Play size={18} className="text-cyan-400 fill-cyan-400" />
              See How It Works
            </button>
          </Link>
        </motion.div>

        {/* Live preview card — Answer Evaluation Engine */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 w-full max-w-4xl relative"
        >
          {/* Fade mask at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10 h-full w-full pointer-events-none" />

          <div className="bg-[#0A0A0A] border border-white/10 rounded-t-2xl p-6 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            {/* Mac-style title bar */}
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <span className="ml-4 text-xs font-mono text-white/40 uppercase tracking-widest">Answer Evaluation Engine</span>
              {streakCount > 0 && (
                <div className="ml-auto flex items-center gap-1 text-[10px] text-orange-300 font-mono">
                  <Zap size={10} className="fill-orange-400 text-orange-400" />
                  {streakCount} Hermes events live
                </div>
              )}
            </div>

            {/* Layout — 2/3 answer view + 1/3 score panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {/* Answer + feedback */}
              <div className="md:col-span-2 space-y-4">
                <div className="h-4 w-1/3 bg-white/5 rounded" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/10 rounded" />
                  <div className="h-3 w-[90%] bg-white/10 rounded" />
                  <div className="h-3 w-[80%] bg-white/10 rounded" />
                </div>
                <div className="p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 size={16} className="text-cyan-400" />
                    <span className="text-cyan-100 text-sm font-medium">Structure Recommendation</span>
                  </div>
                  <p className="text-xs text-cyan-200/60 leading-relaxed">
                    Intro is strong, but body lacks contemporary examples. Consider linking Directive Principles with recent poverty alleviation schemes to secure +1.5 marks here.
                  </p>
                </div>
                {/* Hermes agent activity if live */}
                {data.hermesActivity.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Hermes live</span>
                    {data.hermesActivity.slice(0, 2).map((a) => (
                      <div key={a.id} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-cyan-400/60" />
                        <span className="text-[10px] text-white/40 line-clamp-1">{a.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Score panel */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-2">Estimated Score</div>
                  <div className="text-4xl font-light text-white font-mono">
                    6.5<span className="text-lg text-white/30">/10</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <ScoreBar label="Structure" score={80} />
                  <ScoreBar label="Content" score={65} />
                  <ScoreBar label="Presentation" score={85} />
                </div>
                {data.aspirants > 0 && (
                  <div className="text-[10px] font-mono text-white/25 text-center pt-1">
                    {data.aspirants.toLocaleString('en-IN')} aspirants · {data.topics.toLocaleString('en-IN')} topics indexed
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] text-white/50 uppercase tracking-wider">
        <span>{label}</span>
        <span>{score}%</span>
      </div>
      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.5, delay: 1.6, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
        />
      </div>
    </div>
  );
}
