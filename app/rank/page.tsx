import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { RefreshButton } from './RefreshButton';

export default async function RankPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: prediction } = await supabase
    .from('user_predictions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const gaps = (prediction?.deficit_gaps || []) as Array<{ subject: string; deficit_pct: number; tip: string }>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">🎯 Rank Oracle</h1>
        <RefreshButton />
      </div>

      {prediction ? (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Predicted AIR Range</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-emerald-400">{prediction.predicted_rank_min}</span>
              <span className="text-2xl text-slate-500">—</span>
              <span className="text-4xl font-bold text-emerald-400">{prediction.predicted_rank_max}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Confidence</h2>
              <span className="text-lg font-bold text-cyan-400">{prediction.confidence_pct}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className="bg-cyan-500 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, prediction.confidence_pct)}%` }}
              />
            </div>
          </div>

          {gaps.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Deficit Gaps</h2>
              <div className="space-y-3">
                {gaps.map((g: any, i: number) => (
                  <div key={i} className="flex items-start gap-4 bg-slate-800/50 rounded-lg p-4 border-l-4 border-amber-500">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-200">{g.subject}</span>
                        <span className="text-xs font-bold text-red-400">−{g.deficit_pct}%</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{g.tip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Timeline</h2>
            <p className="mt-2 text-lg text-slate-100">
              Cross the cutoff in approximately <span className="font-bold text-emerald-400">{prediction.days_to_cutoff}</span> days at your current velocity.
            </p>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Last updated: {new Date(prediction.created_at).toLocaleDateString()} {new Date(prediction.created_at).toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">No prediction yet. Complete quiz or daily plan to trigger your first AIR forecast.</p>
          <Link href="/quiz" className="text-emerald-400 hover:underline text-sm">Take a Quiz →</Link>
        </div>
      )}
    </div>
  );
}
