'use client';

import Link from 'next/link';
import { Brain } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

export default function AIStrategist() {
  return (
    <GlassCard
      glow="cyan"
      padding="md"
      className="border border-cyan-500/20 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15">
          <Brain size={16} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Chanakya AI Strategist</h2>
          <p className="text-[11px] text-white/40">Personalised exam strategy</p>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-white/60">
        Based on your pattern, you&apos;re losing marks on Polity &amp; Governance due to careless errors in the last 15 minutes of the paper. Slow down on MCQs with negatives — eliminate two options first, then commit.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/plan">
          <Button variant="primary" size="sm">Get Personalised Plan</Button>
        </Link>
        <Link href="/mentor">
          <Button variant="ghost" size="sm">View Analysis</Button>
        </Link>
      </div>
    </GlassCard>
  );
}
