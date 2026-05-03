'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Brain, RefreshCw } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

interface ActionStep {
  title: string;
  detail: string;
  href?: string;
}

interface Diagnose {
  headline: string;
  diagnosis: string;
  action_steps: ActionStep[];
  focus_subjects: string[];
  confidence: number;
}

export default function AIStrategist() {
  const [diagnose, setDiagnose] = useState<Diagnose | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    try {
      const res = await fetch('/api/strategist/diagnose', { method: force ? 'POST' : 'GET' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDiagnose(json.diagnose);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  return (
    <GlassCard
      glow="cyan"
      padding="md"
      className="border border-cyan-500/20 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/15">
            <Brain size={16} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Chanakya AI Strategist</h2>
            <p className="text-[11px] text-white/40">
              {diagnose ? `Confidence ${(diagnose.confidence * 100).toFixed(0)}%` : 'Personalised exam strategy'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setRefreshing(true); load(true); }}
          disabled={refreshing}
          className="text-white/40 hover:text-cyan-400 disabled:opacity-40"
          aria-label="Refresh diagnosis"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && <p className="mb-4 text-xs text-white/50">Reading your last 30 days…</p>}

      {error && !loading && (
        <p className="mb-4 text-xs text-red-400/80">Strategist unavailable: {error}</p>
      )}

      {diagnose && !loading && (
        <>
          <p className="mb-2 text-sm font-medium leading-snug text-white">{diagnose.headline}</p>
          {diagnose.diagnosis && (
            <p className="mb-4 text-xs leading-relaxed text-white/60">{diagnose.diagnosis}</p>
          )}
          {diagnose.action_steps.length > 0 && (
            <ul className="mb-4 space-y-2">
              {diagnose.action_steps.map((step, i) => (
                <li key={i} className="rounded-md border border-white/5 bg-white/[0.02] p-2">
                  <p className="text-xs font-semibold text-cyan-300">{step.title}</p>
                  <p className="text-[11px] text-white/55">{step.detail}</p>
                  {step.href && (
                    <Link href={step.href} className="text-[11px] text-cyan-400 hover:underline">
                      Open →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {diagnose.focus_subjects.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1">
              {diagnose.focus_subjects.map((s) => (
                <span key={s} className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300">
                  {s}
                </span>
              ))}
            </div>
          )}
        </>
      )}

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
