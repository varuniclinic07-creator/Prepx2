import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();
  const { data: attempts } = await supabase.from('quiz_attempts').select('score,max_score').eq('user_id', user.id);
  const { data: weakAreas } = await supabase.from('user_weak_areas').select('topic_id').eq('user_id', user.id);

  const totalAttempts = attempts?.length || 0;
  const accuracy = totalAttempts > 0
    ? Math.round((attempts!.reduce((s: number, a: { score: number; max_score: number }) => s + (a.score / a.max_score) * 100, 0) / totalAttempts))
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-100">Your Profile</h1>
        <p className="text-slate-400 mt-1">{user.email}</p>
        <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
          profile?.role === 'admin' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20' :
          profile?.subscription_status === 'premium_plus' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
          profile?.subscription_status === 'premium' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
          'bg-slate-500/15 text-slate-400 border border-slate-500/20'
        }`}>
          {profile?.role === 'admin' ? 'Admin' : profile?.subscription_status || 'free'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Quizzes" value={String(totalAttempts)} />
        <StatCard label="Accuracy" value={`${accuracy}%`} />
        <StatCard label="Streak" value={String(profile?.streak_count || 0)} unit="days" />
        <StatCard label="Weak Areas" value={String(weakAreas?.length || 0)} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Language Preference</span>
            <span className="text-sm text-slate-400">{profile?.preferred_language?.toUpperCase() || 'EN'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Baseline Score</span>
            <span className="text-sm text-slate-400">{profile?.baseline_score ?? '-'}/5</span>
          </div>
          <Link href="/pricing" className="inline-block text-sm text-emerald-400 hover:text-emerald-300 mt-2">
            Upgrade Subscription →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-emerald-400">{value}</div>
      {unit && <div className="text-xs text-slate-500">{unit}</div>}
      <div className="text-sm text-slate-300 mt-1">{label}</div>
    </div>
  );
}
