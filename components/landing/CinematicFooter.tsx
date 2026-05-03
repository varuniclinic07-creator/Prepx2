'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export default function CinematicFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050505] pt-24 pb-12 px-4 mt-24">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
            <span className="text-white font-bold text-xl tracking-tighter">PX</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Master UPSC?</h2>
          <p className="text-gray-400 max-w-md mx-auto mb-8 font-light">
            Join the next generation of IAS officers using adaptive AI mentorship to gain a competitive edge.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 rounded-full bg-white text-black font-semibold hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.2)]"
          >
            Get Started For Free
          </Link>
        </motion.div>

        <div className="w-full h-[1px] bg-white/10 mb-8" />

        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40 font-mono tracking-widest uppercase">
          <span>© 2026 PrepX AI. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link href="/manifesto" className="hover:text-white transition-colors">
              Manifesto
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
