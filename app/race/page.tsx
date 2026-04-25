import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function RacePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let readiness = 0;
  let level = 1;
  let strengths: string[] = [];
  let weaknesses: string[] = [];

  if (user) {
    const { data: session } = await supabase.from('user_sessions').select('*').eq('user_id', user.id).single();
    readiness = session?.readiness_score ?? 0;
    level = readiness >= 80 ? 5 : readiness >= 60 ? 4 : readiness >= 40 ? 3 : readiness >= 20 ? 2 : 1;

    const { data: weakAreas } = await supabase.from('user_weak_areas').select('gap_type').eq('user_id', user.id);
    if (weakAreas && weakAreas.length > 0) weaknesses = weakAreas.map((w: any) => w.gap_type);
    else strengths = ['Consistency', 'Concept clarity'];
  }

  const daysToReady = Math.max(1, Math.round((100 - readiness) / 5));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">UPSC Race</h1>
        <p className="text-slate-400">Your readiness journey, visualized.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Readiness Score" value={`${readiness.toFixed(0)}%`} color="emerald" />
        <StatCard label="Level" value={`L${level}`} color="cyan" />
        <StatCard label="Est. Days to Ready" value={`${daysToReady}`} color="amber" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-3">Strengths</h3>
          {strengths.length > 0 ? strengths.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-300 py-1">
              <span className="text-emerald-400">✓</span> {s}
            </div>
          )) : <p className="text-slate-500 text-sm">Keep practicing to reveal strengths.</p>}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider mb-3">Weaknesses</h3>
          {weaknesses.length > 0 ? weaknesses.map((w, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-slate-300 py-1">
              <span className="text-red-400">!</span> {w}
            </div>
          )) : <p className="text-slate-500 text-sm">No weak areas detected yet.</p>}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Subject Readiness</h3>
        <div className="space-y-3">
          {['Polity', 'History', 'Economy', 'Ethics', 'CSAT'].map((subj, i) => {
            const pct = Math.max(10, Math.min(95, readiness + (i * 7 - 14)));
            return (
              <div key={subj}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{subj}</span>
                  <span>{pct}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className={`h-2 rounded-full ${pct > 70 ? 'bg-emerald-500' : pct > 40 ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center">
        <Link href="/" className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: 'emerald' | 'cyan' | 'amber' }) {
  const colors = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };
  return (
    <div className={`rounded-xl p-5 text-center border ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-70 uppercase tracking-wider">{label}</div>
    </div>
  );
}
