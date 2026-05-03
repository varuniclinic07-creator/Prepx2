import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import CinematicLanding from '@/components/landing/CinematicLanding';
import type { HeroLiveData } from '@/components/landing/types';

/**
 * Public marketing landing.
 *
 * Authenticated users are redirected to /dashboard.
 * Anonymous users see the splash + hero + feature pillars.
 *
 * All counter data is fetched server-side from Supabase (real counts —
 * never mocked). Empty arrays render explicit empty-state messaging.
 */

export const revalidate = 30; // 30s ISR for live counters

export default async function MarketingHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  const today = new Date().toISOString().slice(0, 10);

  // Real Supabase counts. Failures degrade to 0 — never crash the marketing
  // page if Supabase is hiccuping.
  const [aspirantsRes, topicsRes, questionsTodayRes, hermesRes, astraRes] = await Promise.allSettled([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('topics').select('*', { count: 'exact', head: true }),
    supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`),
    supabase
      .from('agent_tasks')
      .select('id, agent_type, status, payload, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('topics')
      .select('id, title, subject')
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  const aspirants = aspirantsRes.status === 'fulfilled' ? aspirantsRes.value.count ?? 0 : 0;
  const topics = topicsRes.status === 'fulfilled' ? topicsRes.value.count ?? 0 : 0;
  const questionsToday =
    questionsTodayRes.status === 'fulfilled' ? questionsTodayRes.value.count ?? 0 : 0;

  const hermesActivity =
    hermesRes.status === 'fulfilled' && hermesRes.value.data
      ? hermesRes.value.data.map((row: Record<string, unknown>) => ({
          id: String(row.id ?? ''),
          agent: String(row.agent_type ?? 'agent'),
          summary: summarizeAgentTask(row),
          status: String(row.status ?? 'pending'),
        }))
      : [];

  const astraSource =
    astraRes.status === 'fulfilled' && astraRes.value.data && astraRes.value.data.length > 0
      ? astraRes.value.data[0]
      : null;

  const data: HeroLiveData = {
    aspirants,
    topics,
    questionsToday,
    hermesActivity,
    todayPlan: null,
    astraPreview: astraSource
      ? { title: String(astraSource.title ?? 'Untitled'), subject: String(astraSource.subject ?? 'UPSC') }
      : null,
  };

  return <CinematicLanding data={data} />;
}

function summarizeAgentTask(row: Record<string, unknown>): string {
  const agent = String(row.agent_type ?? 'agent');
  const payload = (row.payload as Record<string, unknown> | null | undefined) ?? null;
  const topic = payload && typeof payload === 'object' ? (payload['topic'] ?? payload['subject'] ?? payload['query']) : undefined;
  if (topic) return `${agent} → ${String(topic).slice(0, 64)}`;
  const status = String(row.status ?? 'pending');
  return `${agent} (${status})`;
}
