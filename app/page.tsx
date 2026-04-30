import { createClient } from '@/lib/supabase-server';
import { DailyPlan } from '../components/DailyPlan';
import { generateDailyPlan } from '@/lib/plan-generator';
import { redirect } from 'next/navigation';

async function DashboardStats({ userId, profile }: { userId: string; profile: any }) {
  const supabase = await createClient();
  const [{ count: totalTopics }, { count: quizAttempts }, { count: weakAreaCount }] = await Promise.all([
    supabase.from('topics').select('*', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('user_weak_areas').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);
  const quizAvg = quizAttempts && totalTopics ? Math.round((quizAttempts / totalTopics) * 100) + '%' : '0%';
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Streak" value={profile?.streak_count?.toString() || '0'} unit="days" />
      <StatCard label="Baseline" value={profile?.baseline_score?.toString() || '-'} unit="/ 5" />
      <StatCard label="Quiz Avg" value={quizAvg} unit="" />
      <StatCard label="Weak Areas" value={String(weakAreaCount ?? 0)} unit="injected" />
    </div>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('baseline_score,streak_count,role').eq('id', user.id).single();
  if (profile && profile.baseline_score === null) redirect('/onboarding');

  const today = new Date().toISOString().split('T')[0];
  let { data: plan } = await supabase.from('daily_plans').select('*').eq('user_id', user.id).eq('plan_date', today).single();

  // If no plan or still using all-topic-001 static fallback, regenerate
  const isStaticFallback = plan && plan.tasks && plan.tasks.length > 0 && plan.tasks.every((t: any) => t.topic_id === 'topic-001');
  if (!plan || isStaticFallback) {
    const tasks = await generateDailyPlan(user.id);
    const { data: upserted } = await supabase
      .from('daily_plans')
      .upsert(
        { user_id: user.id, plan_date: today, tasks, status: 'pending' },
        { onConflict: 'user_id,plan_date' }
      )
      .select()
      .single();
    if (upserted) plan = upserted;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Good Morning, Aspirant</h1>
        <p className="text-slate-400">Your daily mission is ready. Let&apos;s close the learning loop today.</p>
      </div>
      
      <DailyPlan userId={user.id} initialPlan={plan || null} />
      
      <DashboardStats userId={user.id} profile={profile} />
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-emerald-400">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{unit}</div>
      <div className="text-sm text-slate-300 mt-1">{label}</div>
    </div>
  );
}

