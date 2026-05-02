// User-facing Current Affairs page (Sprint 2 / Epic 5.3).
// Shows today's published bundle: theme, summary, and clustered articles
// with key_points + per-article mark-as-read tracking.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ArrowRight, Newspaper } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { getUser } from '@/lib/auth';
import { Topbar } from '@/components/nav/Topbar';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ArticleReadToggle } from './ArticleReadToggle';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BundleArticleRow = {
  id: string;
  article_id: string;
  relevance: 'prelims' | 'mains' | 'both';
  key_points: string[];
  position: number;
  cluster_label: string | null;
  research_articles: {
    id: string;
    title: string;
    source_url: string;
    summary: string | null;
    source_id: string | null;
    published_at: string | null;
  } | null;
};

export default async function CurrentAffairsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const sb = await createClient();

  // Most recent published bundle. RLS hides drafts, so this is safe for users.
  const { data: bundle } = await sb
    .from('ca_daily_bundles')
    .select('id, bundle_date, theme, subtitle, summary, syllabus_tags, article_count')
    .eq('status', 'published')
    .order('bundle_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const [articlesRes, readsRes, balanceRes, profileRes] = await Promise.all([
    bundle
      ? sb
          .from('ca_bundle_articles')
          .select(
            'id, article_id, relevance, key_points, position, cluster_label, research_articles(id, title, source_url, summary, source_id, published_at)'
          )
          .eq('bundle_id', bundle.id)
          .order('position', { ascending: true })
      : Promise.resolve({ data: null as null }),
    bundle
      ? sb
          .from('ca_bundle_reads')
          .select('article_id')
          .eq('bundle_id', bundle.id)
          .eq('user_id', user.id)
      : Promise.resolve({ data: null as null }),
    sb.from('user_balances').select('coins').eq('user_id', user.id).maybeSingle(),
    sb.from('users').select('full_name').eq('id', user.id).single(),
  ]);

  const articles = (articlesRes?.data ?? []) as unknown as BundleArticleRow[];
  const readArticleIds = new Set(
    (readsRes?.data ?? [])
      .map((r: { article_id: string | null }) => r.article_id)
      .filter((id): id is string => !!id)
  );

  const coinBalance = balanceRes.data?.coins ?? 0;

  // Tenant
  const h = await headers();
  const tenantSlug = h.get('x-tenant-slug');
  let tenantName: string | null = null;
  let tenantLogo: string | null = null;
  if (tenantSlug) {
    const { data: t } = await sb
      .from('white_label_tenants')
      .select('name, logo_url')
      .eq('slug', tenantSlug)
      .maybeSingle();
    if (t) {
      tenantName = t.name;
      tenantLogo = t.logo_url;
    }
  }

  // Group articles by cluster_label for display.
  const clusters = new Map<string, BundleArticleRow[]>();
  for (const a of articles) {
    const key = a.cluster_label ?? 'Other';
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(a);
  }

  const totalArticles = articles.length;
  const readCount = articles.filter((a) => readArticleIds.has(a.article_id)).length;

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)] text-white">
      <Topbar coinBalance={coinBalance} tenantName={tenantName} logoUrl={tenantLogo} />

      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex items-center gap-3">
          <Newspaper className="h-6 w-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Current Affairs</h1>
            <p className="text-sm text-slate-400">
              Daily UPSC-relevant news, clustered by Hermes at 7 AM IST.
            </p>
          </div>
        </div>

        {!bundle ? (
          <Card padding="md">
            <CardHeader>
              <div>
                <CardTitle>Today&apos;s bundle is being assembled</CardTitle>
                <CardSub>Hermes runs the bundle sweep at 7 AM IST. Check back shortly.</CardSub>
              </div>
              <Pill tone="warning">Generating</Pill>
            </CardHeader>
            <p className="mt-4 text-sm text-slate-400">
              While you wait, you can{' '}
              <Link href="/dashboard" className="text-cyan-400 hover:underline">
                review your daily plan
              </Link>{' '}
              or{' '}
              <Link href="/quiz" className="text-cyan-400 hover:underline">
                take a quiz
              </Link>
              .
            </p>
          </Card>
        ) : (
          <>
            <Card padding="md">
              <CardHeader>
                <div>
                  <CardTitle>{bundle.theme}</CardTitle>
                  <CardSub>
                    {new Date(bundle.bundle_date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    {bundle.subtitle ? ` · ${bundle.subtitle}` : ''}
                  </CardSub>
                </div>
                <Pill tone="cyan">
                  {readCount}/{totalArticles} read
                </Pill>
              </CardHeader>

              <p className="mt-3 text-sm leading-relaxed text-white/80">{bundle.summary}</p>

              {Array.isArray(bundle.syllabus_tags) && bundle.syllabus_tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {bundle.syllabus_tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>

            {Array.from(clusters.entries()).map(([clusterLabel, rows]) => (
              <section key={clusterLabel} className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-200">{clusterLabel}</h2>
                <div className="space-y-3">
                  {rows.map((row) => {
                    const article = row.research_articles;
                    if (!article) return null;
                    const isRead = readArticleIds.has(row.article_id);
                    return (
                      <article
                        key={row.id}
                        className={`rounded-xl border p-4 transition ${
                          isRead
                            ? 'border-slate-800 bg-slate-900/40 opacity-70'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                              <span>{article.source_id ?? 'source'}</span>
                              <span>·</span>
                              <span
                                className={
                                  row.relevance === 'prelims'
                                    ? 'text-emerald-400'
                                    : row.relevance === 'mains'
                                    ? 'text-amber-400'
                                    : 'text-cyan-400'
                                }
                              >
                                {row.relevance}
                              </span>
                            </div>
                            <h3 className="text-base font-semibold text-slate-100">
                              <a
                                href={article.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-cyan-400 hover:underline"
                              >
                                {article.title}
                              </a>
                            </h3>

                            {Array.isArray(row.key_points) && row.key_points.length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                                {row.key_points.map((kp, i) => (
                                  <li key={i}>{kp}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <ArticleReadToggle
                            bundleId={bundle.id}
                            articleId={row.article_id}
                            initialRead={isRead}
                          />
                        </div>

                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                          <a
                            href={article.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-400 hover:underline"
                          >
                            Read source <ArrowRight size={12} />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
