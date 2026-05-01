// Admin → Research dashboard.
// Lists primary sources with last-crawl status, recent articles awaiting review,
// and a "Run now" button to enqueue a crawl-source agent task.

import { getAdminClient } from '@/lib/supabase-admin';
import { SOURCE_REGISTRY, PRIMARY_SOURCE_IDS } from '@/lib/scraper/config';
import { RunSourceButton } from './RunSourceButton';

export const dynamic = 'force-dynamic';

type CrawlRow = {
  source_id: string;
  source_name: string | null;
  total_articles: number | null;
  articles_processed: number | null;
  articles_errored: number | null;
  crawled_at: string;
  duration_ms: number | null;
  last_error: string | null;
};

type ArticleRow = {
  id: string;
  source_id: string;
  source_name: string | null;
  title: string | null;
  summary: string | null;
  status: string;
  scraped_at: string;
  tags: string[] | null;
};

export default async function AdminResearchPage() {
  const sb = getAdminClient();

  // Last crawl per source (window function — distinct on source_id).
  const { data: crawlRows } = await sb
    .from('crawl_history')
    .select('source_id, source_name, total_articles, articles_processed, articles_errored, crawled_at, duration_ms, last_error')
    .order('crawled_at', { ascending: false })
    .limit(200);
  const lastBySource = new Map<string, CrawlRow>();
  for (const r of (crawlRows ?? []) as CrawlRow[]) {
    if (!lastBySource.has(r.source_id)) lastBySource.set(r.source_id, r);
  }

  const { data: recent } = await sb
    .from('research_articles')
    .select('id, source_id, source_name, title, summary, status, scraped_at, tags')
    .order('scraped_at', { ascending: false })
    .limit(40);

  const { data: counts } = await sb
    .from('research_articles')
    .select('status', { count: 'exact', head: false });
  const tally: Record<string, number> = {};
  for (const r of counts ?? []) tally[r.status] = (tally[r.status] ?? 0) + 1;

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Research Crawler</h1>
        <p className="text-sm text-slate-400 mt-1">
          Primary daily sweep runs at 09:00 IST. Use &quot;Run now&quot; for ad-hoc triggers.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Article corpus</h2>
        <div className="flex gap-3 flex-wrap">
          {(['raw', 'enriched', 'linked', 'rejected'] as const).map(s => (
            <div key={s} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2">
              <div className="text-xs uppercase tracking-wider text-slate-500">{s}</div>
              <div className="text-2xl font-mono text-slate-100">{tally[s] ?? 0}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Sources</h2>
        <div className="overflow-x-auto bg-slate-900/40 border border-slate-800 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="text-slate-400 text-xs uppercase tracking-wider">
              <tr className="border-b border-slate-800">
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Primary?</th>
                <th className="px-3 py-2 text-left">Last crawl</th>
                <th className="px-3 py-2 text-right">Total / Inserted / Errored</th>
                <th className="px-3 py-2 text-left">Last error</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {SOURCE_REGISTRY.filter(s => s.enabled).map(src => {
                const last = lastBySource.get(src.id);
                const isPrimary = PRIMARY_SOURCE_IDS.includes(src.id);
                return (
                  <tr key={src.id} className="border-b border-slate-800/60">
                    <td className="px-3 py-2 font-mono text-xs">{src.id}</td>
                    <td className="px-3 py-2">{isPrimary ? <span className="text-emerald-400">●</span> : <span className="text-slate-600">—</span>}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">{last ? new Date(last.crawled_at).toLocaleString() : 'never'}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {last ? `${last.total_articles ?? 0} / ${last.articles_processed ?? 0} / ${last.articles_errored ?? 0}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-rose-400 max-w-md truncate">{last?.last_error ?? ''}</td>
                    <td className="px-3 py-2 text-right"><RunSourceButton sourceId={src.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-300 mb-2">Recent articles (40)</h2>
        <ul className="space-y-2">
          {(recent ?? []).map((a: ArticleRow) => (
            <li key={a.id} className="bg-slate-900/40 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-500">{a.source_id}</span>
                <span className={
                  a.status === 'linked' ? 'text-emerald-400' :
                  a.status === 'enriched' ? 'text-cyan-400' :
                  a.status === 'rejected' ? 'text-rose-400' :
                  'text-slate-500'
                }>{a.status}</span>
                <span className="text-slate-500">{new Date(a.scraped_at).toLocaleString()}</span>
              </div>
              <div className="text-sm text-slate-100 mt-1">{a.title ?? '(untitled)'}</div>
              {a.summary && <div className="text-xs text-slate-400 mt-1 line-clamp-2">{a.summary}</div>}
              {a.tags && a.tags.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {a.tags.map(t => <span key={t} className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">{t}</span>)}
                </div>
              )}
            </li>
          ))}
          {(recent ?? []).length === 0 && <li className="text-xs text-slate-500">No articles scraped yet.</li>}
        </ul>
      </section>
    </div>
  );
}
