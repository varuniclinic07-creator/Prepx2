'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function RevealPage() {
  const [baseline, setBaseline] = useState(0);
  const [current, setCurrent] = useState(0);
  const [day, setDay] = useState(0);
  const [cohortStart, setCohortStart] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from('users').select('baseline_score,created_at').eq('id', user.id).single();
      const { data: session } = await supabase.from('user_sessions').select('created_at').eq('user_id', user.id).single();
      const { data: cohort } = await supabase.from('user_cohorts').select('cohort_start_date').eq('user_id', user.id).single();

      const start = new Date(cohort?.cohort_start_date ?? session?.created_at ?? u?.created_at ?? new Date());
      setCohortStart(start.toISOString());
      const d = Math.min(14, Math.max(0, Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24))));
      setDay(d);
      setBaseline(u?.baseline_score ?? 0);
      setCurrent(0);
    }
    load();
  }, []);

  const delta = current - baseline * 10;
  const improved = delta > 20;

  return (
    <div className="max-w-2xl mx-auto space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">{day >= 14 ? 'Day 14 Reveal' : `Day ${day} of 14`}</h1>
        <p className="text-slate-400">Your progress since joining PrepX.</p>
      </div>

      {day >= 14 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Baseline</div>
              <div className="text-2xl font-bold text-slate-300">{baseline}/5</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Day 14</div>
              <div className="text-2xl font-bold text-emerald-400">{current.toFixed(0)}%</div>
            </div>
          </div>
          <div className={`text-sm font-medium ${improved ? 'text-emerald-400' : 'text-amber-400'}`}>
            {improved ? `Readiness improved by ${delta.toFixed(0)} points. Accelerating to advanced topics.` : 'Focus on remedial plan with extra weak-area practice.'}
          </div>
        </div>
      )}

      {day < 14 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className="text-slate-400">Keep going! Your reveal unlocks in {14 - day} day{14 - day !== 1 ? 's' : ''}.</p>
        </div>
      )}

      <div className="space-y-3">
        <Link href="/race" className="block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition">View UPSC Race</Link>
        <Link href="/squads" className="block px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-xl transition">Join Study Squad</Link>
      </div>
    </div>
  );
}
