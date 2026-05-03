'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Compass, BookOpen, BrainCircuit, Activity, User, Sparkles } from 'lucide-react';

export default function CinematicNavbar() {
  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center px-4 pt-6"
    >
      <div className="flex items-center gap-8 backdrop-blur-3xl bg-black/40 border border-white/10 px-8 py-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <Link href="/" className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)] group-hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] transition-shadow">
            <span className="text-white font-bold text-sm tracking-tighter">PX</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
            Prep<span className="text-blue-400">X</span>
          </span>
        </Link>

        <div className="h-6 w-[1px] bg-white/10 hidden md:block" />

        <div className="hidden md:flex items-center gap-6">
          <NavLink icon={<Compass size={18} />} label="Dashboard" href="/dashboard" />
          <NavLink icon={<BookOpen size={18} />} label="Syllabus" href="/syllabus" />
          <NavLink icon={<Activity size={18} />} label="Conquest" href="/conquest" />
          <NavLink icon={<BrainCircuit size={18} />} label="Mentor" href="/mentor" isAI />
        </div>

        <div className="h-6 w-[1px] bg-white/10 hidden md:block" />

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-white/60 hover:text-white transition-colors" aria-label="Sign in">
            <User size={20} />
          </Link>
          <Link
            href="/signup"
            className="relative overflow-hidden rounded-full bg-white text-black px-5 py-2 text-sm font-semibold hover:scale-105 transition-transform"
          >
            <span className="relative z-10">Start Learning</span>
            <span className="absolute inset-0 bg-gradient-to-r from-blue-100 to-orange-100 opacity-0 hover:opacity-100 transition-opacity z-0" />
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}

function NavLink({
  icon,
  label,
  href,
  isAI = false,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  isAI?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 text-sm font-medium transition-colors text-white/50 hover:text-white/90"
    >
      {icon}
      <span>{label}</span>
      {isAI && (
        <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-500/30">
          <Sparkles size={10} />
          AI
        </span>
      )}
    </Link>
  );
}
