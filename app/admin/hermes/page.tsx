// Admin observability surface for Hermes (B2-2).
// Auth: middleware.ts gates `/admin/*` by role=admin already.

import { createClient } from '@/lib/supabase-server';
import { HERMES_STATES } from '@/lib/agents/hermes';
import { getHermesStatus } from '@/lib/agents/hermes-dispatch';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

export default async function AdminHermesPage() {
  const supabase = await createClient();

  const [sessions, jobLogs, crawlHistory] = await Promise.all([
    supabase.from('user_sessions').select('user_id, session_state, last_activity_at, current_topic_id'),
    supabase.from('job_logs')
      .select('id, agent_task_id, agent_type, status, error_message, duration_ms, created_at, attempt')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('crawl_history')
      .select('id, source_id, source_name, total_articles, articles_processed, articles_errored, crawled_at, duration_ms')
      .order('crawled_at', { ascending: false })
      .limit(20),
  ]);

  // status hits BullMQ via lib/queue/queues. Will throw if Redis unreachable;
  // surface a friendly message instead of crashing the page.
  let status: Awaited<ReturnType<typeof getHermesStatus>> | null = null;
  let statusError: string | null = null;
  try {
    status = await getHermesStatus(supabase);
  } catch (err: any) {
    statusError = err?.message || 'Failed to reach Redis';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Hermes Monitor</h1>
          <p className="text-slate-400 text-sm">Live worker status, sweeps, and job lifecycle.</p>
        </div>
        <form action="/api/admin/hermes/sweep" method="post">
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition"
          >
            Trigger sweep now
          </button>
        </form>
      </div>

      {statusError && (
        <div className="bg-amber-900/30 border border-amber-700/40 text-amber-200 rounded-lg p-3 text-sm">
          Redis unreachable: <span className="font-mono">{statusError}</span>
        </div>
      )}

      {/* Queue depths */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Queue depths</h2>
        {status ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(status.queues).map(([name, c]: any) => (
              <div key={name} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                <div className="text-xs uppercase tracking-wider text-slate-500">{name}</div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                  <span className="text-slate-400">waiting</span>   <span className="text-emerald-400 font-mono text-right">{c.waiting}</span>
                  <span className="text-slate-400">active</span>    <span className="text-cyan-400 font-mono text-right">{c.active}</span>
                  <span className="text-slate-400">completed</span> <span className="text-slate-300 font-mono text-right">{c.completed}</span>
                  <span className="text-slate-400">failed</span>    <span className="text-rose-400 font-mono text-right">{c.failed}</span>
                  <span className="text-slate-400">delayed</span>   <span className="text-amber-400 font-mono text-right">{c.delayed}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">No queue data available.</p>
        )}
      </section>

      {/* Last sweeps */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Last sweep</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <SweepCard label="Planner (00:30 IST)"        ts={status?.lastSweeps.planner} />
          <SweepCard label="Research sweep (09:00 IST)" ts={status?.lastSweeps.researchSweep} />
          <SweepCard label="Content sweep (11:00 IST)"  ts={status?.lastSweeps.contentSweep} />
        </div>
      </section>

      {/* Sessions overview (existing) */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">User sessions ({sessions.data?.length ?? 0})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HERMES_STATES.map(state => {
            const count = sessions.data?.filter((s: any) => s.session_state === state).length ?? 0;
            return (
              <div key={state} className={`bg-slate-800/50 border rounded-lg p-3 text-center ${count > 0 ? 'border-emerald-500/20' : 'border-slate-700'}`}>
                <div className="text-2xl font-bold text-emerald-400">{count}</div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{state}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent job logs */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Last 50 jobs</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Attempt</th>
              <th className="px-4 py-3">Error / Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {jobLogs.data && jobLogs.data.length > 0 ? jobLogs.data.map((row: any) => (
              <tr key={row.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(row.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-300 text-xs font-mono">{row.agent_type}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${statusBadge(row.status)}`}>{row.status}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{row.duration_ms != null ? `${row.duration_ms} ms` : '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{row.attempt}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {row.status === 'dead_letter' && row.agent_task_id ? (
                    <form action="/api/admin/hermes/retry" method="post" className="inline">
                      <input type="hidden" name="taskId" value={row.agent_task_id} />
                      <button type="submit" className="px-2 py-1 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 rounded">
                        Retry
                      </button>
                    </form>
                  ) : (
                    <span className="text-slate-500 truncate block max-w-[28rem]">{row.error_message || '—'}</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No jobs logged yet</td></tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Crawl history */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Crawl history (last 20)</h2>
          <p className="text-xs text-slate-500 mt-1">Populated by B2-4 research crawler. Empty until that batch lands.</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Articles</th>
              <th className="px-4 py-3">Processed</th>
              <th className="px-4 py-3">Errored</th>
              <th className="px-4 py-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {crawlHistory.data && crawlHistory.data.length > 0 ? crawlHistory.data.map((row: any) => (
              <tr key={row.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 text-xs">{row.crawled_at ? new Date(row.crawled_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{row.source_name || row.source_id}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{row.total_articles ?? 0}</td>
                <td className="px-4 py-3 text-emerald-400 text-xs">{row.articles_processed ?? 0}</td>
                <td className="px-4 py-3 text-rose-400 text-xs">{row.articles_errored ?? 0}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{row.duration_ms != null ? `${row.duration_ms} ms` : '—'}</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No crawls recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function SweepCard({ label, ts }: { label: string; ts?: string | null }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-200 mt-1">{ts ? new Date(ts).toLocaleString() : 'Never run yet'}</div>
    </div>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':   return 'bg-emerald-500/20 text-emerald-300';
    case 'processing':  return 'bg-cyan-500/20 text-cyan-300';
    case 'queued':      return 'bg-slate-700 text-slate-300';
    case 'failed':      return 'bg-rose-500/20 text-rose-300';
    case 'retried':     return 'bg-amber-500/20 text-amber-300';
    case 'dead_letter': return 'bg-rose-700/40 text-rose-200';
    default:            return 'bg-slate-700 text-slate-400';
  }
}
