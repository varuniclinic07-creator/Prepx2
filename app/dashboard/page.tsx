import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BookOpen, Coins, Library, Newspaper, Swords } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { getUser } from '@/lib/auth';
import { generateDailyPlan } from '@/lib/plan-generator';
import { Topbar } from '@/components/nav/Topbar';
import { DailyPlan } from '@/components/DailyPlan';
import { GlassCard } from '@/components/ui/GlassCard';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting';
import { HermesFeed, type HermesTaskRow } from '@/components/dashboard/HermesFeed';
import { RecentAttempts, type RecentAttempt } from '@/components/dashboard/RecentAttempts';
import { headers } from 'next/headers';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();

  // Weak-area data is intentionally NOT surfaced on the dashboard — Hermes
  // injects review tasks into the daily plan invisibly so the user sees
  // forward progress, not a "you are weak in X" diagnostic.
  const [profileRes, balanceRes, hermesRes, attemptsRes, astraRes] = await Promise.allSettled([
    supabase
      .from('users')
      .select('baseline_score, streak_count, role, full_name, preferred_language')
      .eq('id', user.id)
      .single(),
    supabase.from('user_balances').select('coins').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('agent_tasks')
      .select('id, agent_type, status, payload, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('quiz_attempts')
      .select('id, score, total_questions, created_at, quiz_id, quizzes(topic_id, topics(title))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('topics')
      .select('id, title, subject')
      .order('updated_at', { ascending: false })
      .limit(1),
  ]);

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data : null;

  // Onboarding gate (mirrors prior behavior so we don't regress that flow).
  if (profile && profile.baseline_score === null) redirect('/onboarding');

  const streak = profile?.streak_count ?? 0;
  const fullName = profile?.full_name ?? user.email?.split('@')[0] ?? '';

  const coinBalance =
    balanceRes.status === 'fulfilled' ? balanceRes.value.data?.coins ?? 0 : 0;

  // Daily plan (preserve original generation logic from app/page.tsx).
  const today = new Date().toISOString().split('T')[0];
  let { data: plan } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_date', today)
    .maybeSingle();

  const isStaticFallback =
    plan && plan.tasks && plan.tasks.length > 0 && plan.tasks.every((t: { topic_id: string }) => t.topic_id === 'topic-001');
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

  const planTasks: { type: string; status: string }[] = plan?.tasks ?? [];
  const planComplete = planTasks.filter((t) => t.status === 'completed').length;
  const planTotal = planTasks.length;

  // Hermes feed.
  const hermesTasks: HermesTaskRow[] =
    hermesRes.status === 'fulfilled'
      ? (hermesRes.value.data ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.id),
          agent_type: String(row.agent_type ?? 'agent'),
          status: String(row.status ?? 'pending'),
          summary: summarizeTask(row),
          created_at: String(row.created_at),
        }))
      : [];

  // Recent quiz attempts.
  const recent: RecentAttempt[] =
    attemptsRes.status === 'fulfilled'
      ? (attemptsRes.value.data ?? []).map((row: Record<string, unknown>) => {
          const quiz = (row.quizzes as { topics?: { title?: string } | { title?: string }[] | null } | null) ?? null;
          const topicField = Array.isArray(quiz?.topics) ? quiz?.topics?.[0] : quiz?.topics;
          return {
            id: String(row.id),
            topic_title: topicField?.title ?? 'Quiz attempt',
            score: Number(row.score ?? 0),
            total: Number(row.total_questions ?? 0),
            created_at: String(row.created_at),
          };
        })
      : [];

  // Tenant
  const h = await headers();
  const tenantSlug = h.get('x-tenant-slug');
  let tenantName: string | null = null;
  let tenantLogo: string | null = null;
  if (tenantSlug) {
    const { data: t } = await supabase
      .from('white_label_tenants')
      .select('name, logo_url')
      .eq('slug', tenantSlug)
      .maybeSingle();
    if (t) {
      tenantName = t.name;
      tenantLogo = t.logo_url;
    }
  }

  const astra = astraRes.status === 'fulfilled' ? astraRes.value.data?.[0] : null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)] text-white">
      <Topbar coinBalance={coinBalance} tenantName={tenantName} logoUrl={tenantLogo} />

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <DashboardGreeting
          name={fullName}
          streak={streak}
          planComplete={planComplete}
          planTotal={planTotal}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column — Daily plan + Astra preview */}
          <div className="space-y-6 lg:col-span-2">
            <Card padding="md">
              <DailyPlan userId={user.id} initialPlan={plan ?? null} />
            </Card>

            <GlassCard glow="cyan" padding="md">
              <CardHeader>
                <div>
                  <CardTitle>{astra?.title ?? 'Today\'s Astra Lecture'}</CardTitle>
                  <CardSub>{astra?.subject ?? 'UPSC Corpus refresh — drafted by Hermes'}</CardSub>
                </div>
                <Pill tone="cyan">Live</Pill>
              </CardHeader>

              <p className="mb-4 text-sm leading-relaxed text-white/65">
                {astra
                  ? `Continue your study of ${astra.subject ?? 'today\'s topic'} with the latest Astra-generated lecture script.`
                  : 'Tonight\'s lecture script is being assembled by Hermes — check back at 6 AM.'}
              </p>

              <Link href="/astra">
                <Button variant="primary" size="sm">
                  Open Astra <ArrowRight size={14} />
                </Button>
              </Link>
            </GlassCard>

            <GlassCard glow="cyan" padding="md">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-cyan-400" />
                  <CardTitle>Today&apos;s Current Affairs</CardTitle>
                </div>
                <Pill tone="cyan">7 AM IST</Pill>
              </CardHeader>
              <p className="mb-4 text-sm leading-relaxed text-white/65">
                Hermes clusters the day&apos;s UPSC-relevant news into a single bundle with prelims/mains tagging and key-points per article.
              </p>
              <Link href="/current-affairs">
                <Button variant="primary" size="sm">
                  Open Current Affairs <ArrowRight size={14} />
                </Button>
              </Link>
            </GlassCard>

            <Card padding="md">
              <CardHeader>
                <CardTitle>Recent quiz attempts</CardTitle>
              </CardHeader>
              <RecentAttempts attempts={recent} />
            </Card>
          </div>

          {/* Right column — Hermes + radar + teasers */}
          <div className="space-y-6">
            <GlassCard glow="primary" padding="md">
              <CardHeader>
                <div>
                  <CardTitle>Hermes activity</CardTitle>
                  <CardSub>Last 10 jobs from your queue</CardSub>
                </div>
                <Pill tone="primary">24/7</Pill>
              </CardHeader>
              <HermesFeed tasks={hermesTasks} />
            </GlassCard>

            <div className="grid grid-cols-2 gap-4">
              <DashboardTeaser
                href="/battle-royale"
                icon={<Swords size={18} className="text-[var(--color-accent-magenta-500)]" />}
                title="Battles"
                body="Challenge a peer to a 1v1 streak duel."
              />
              <DashboardTeaser
                href="/shop"
                icon={<Coins size={18} className="text-[var(--color-accent-saffron)]" />}
                title="Coin shop"
                body="Hint packs, slots, 3D unlocks."
              />
            </div>

            <DashboardTeaser
              href="/topic"
              icon={<Library size={18} className="text-[var(--color-accent-cyan-400)]" />}
              title="Smart book of the day"
              body={astra?.title ?? 'Pick the next topic from the corpus.'}
              full
            />
          </div>
        </div>

        <PrimaryNavGrid />
      </main>
    </div>
  );
}

function summarizeTask(row: Record<string, unknown>): string {
  const payload = (row.payload as Record<string, unknown> | null | undefined) ?? null;
  const topic = payload && typeof payload === 'object' ? (payload['topic'] ?? payload['subject'] ?? payload['query']) : undefined;
  if (topic) return String(topic).slice(0, 80);
  return `${String(row.agent_type ?? 'agent')} task`;
}

function DashboardTeaser({
  href,
  icon,
  title,
  body,
  full,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  full?: boolean;
}) {
  return (
    <Link href={href} className={full ? 'block' : 'block h-full'}>
      <Card interactive padding="sm" className="h-full">
        <div className="mb-2 flex items-center gap-2">{icon}<span className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{title}</span></div>
        <p className="text-sm text-white/75">{body}</p>
      </Card>
    </Link>
  );
}

function PrimaryNavGrid() {
  const links = [
    { href: '/astra', label: 'Astra', icon: BookOpen, tint: 'cyan' as const },
    { href: '/dhwani', label: 'Dhwani', icon: BookOpen, tint: 'primary' as const },
    { href: '/mnemonics', label: 'Mnemonics', icon: BookOpen, tint: 'secondary' as const },
    { href: '/voice', label: 'Voice', icon: BookOpen, tint: 'cyan' as const },
    { href: '/interview', label: 'Interview', icon: BookOpen, tint: 'primary' as const },
    { href: '/essay-colosseum', label: 'Colosseum', icon: BookOpen, tint: 'secondary' as const },
    { href: '/territory', label: 'Territory', icon: BookOpen, tint: 'saffron' as const },
    { href: '/tutors', label: 'Tutors', icon: BookOpen, tint: 'cyan' as const },
    { href: '/spatial', label: 'Spatial', icon: BookOpen, tint: 'primary' as const },
    { href: '/rank', label: 'Rank', icon: BookOpen, tint: 'saffron' as const },
  ];

  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">All zones</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-white/70 transition-colors hover:border-white/15 hover:bg-white/5 hover:text-white"
          >
            <span>{l.label}</span>
            <ArrowRight size={14} className="text-white/30 transition-colors group-hover:text-white" />
          </Link>
        ))}
      </div>
    </section>
  );
}
