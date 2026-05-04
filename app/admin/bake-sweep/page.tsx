// /admin/bake-sweep — observability + manual trigger for the R3F → ComfyUI MP4
// baking sweep. Mirrors /admin/hermes layout patterns.

import { getAdminClient } from '@/lib/supabase-admin';
import ComfyuiStatusPill from './ComfyuiStatusPill';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SweepLogRow {
  id: string;
  sweep_started_at: string | null;
  sweep_ended_at: string | null;
  total_rows: number | null;
  baked_count: number | null;
  failed_count: number | null;
  per_table: Record<string, unknown> | null;
}

interface SweepJobRow {
  id: string;
  sweep_id: string | null;
  source_table: string;
  row_id: string;
  status: 'rendered' | 'failed' | 'skipped';
  error_message: string | null;
  prompt_id: string | null;
  storage_path: string | null;
  duration_ms: number | null;
  created_at: string;
}

const STATUS_BADGE: Record<SweepJobRow['status'], string> = {
  rendered: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  failed:   'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
  skipped:  'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { hour12: false, dateStyle: 'short', timeStyle: 'medium' });
}

function fmtDuration(ms: number | null | undefined) {
  if (!ms) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = s / 60;
  return `${m.toFixed(1)} min`;
}

export default async function AdminBakeSweepPage() {
  const admin = getAdminClient();

  const [{ data: sweeps }, { data: jobs }, { data: bakeable }] = await Promise.all([
    admin.from('bake_sweep_log')
      .select('id, sweep_started_at, sweep_ended_at, total_rows, baked_count, failed_count, per_table')
      .order('sweep_started_at', { ascending: false })
      .limit(10),
    admin.from('bake_sweep_jobs')
      .select('id, sweep_id, source_table, row_id, status, error_message, prompt_id, storage_path, duration_ms, created_at')
      .order('created_at', { ascending: false })
      .limit(40),
    admin.from('bakeable_rows').select('source_table, row_id').limit(200),
  ]);

  const queueByTable = new Map<string, number>();
  for (const r of (bakeable as any[] | null) ?? []) {
    queueByTable.set(r.source_table, (queueByTable.get(r.source_table) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Bake Sweep</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Drives ComfyUI (LTX 2.3) to bake R3F SceneSpec rows into MP4 / WEBP, uploads to Supabase Storage,
            flips <code>render_status</code> from <code>r3f_only</code> → <code>rendered</code> with a signed URL.
            Runs nightly at 1 AM IST via <code>hermes-bake-sweep</code>; this page lets admins trigger it on demand.
          </p>
        </div>
        <form action="/api/admin/hermes/bake-sweep" method="post">
          <button
            type="submit"
            className="rounded-lg bg-amber-400 px-5 py-2.5 font-bold text-slate-950 transition hover:bg-amber-300"
          >
            Bake now
          </button>
        </form>
      </div>

      <ComfyuiStatusPill />

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          'mnemonic_artifacts',
          'imagine_videos',
          'interview_debriefs',
          'animated_mindmaps',
          'concept_shorts',
          'ca_video_newspapers',
        ].map((t) => (
          <div key={t} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500">{t.replace(/_/g, ' ')}</div>
            <div className="mt-1 text-2xl font-bold text-slate-100">{queueByTable.get(t) ?? 0}</div>
            <div className="text-xs text-slate-500">rows awaiting bake</div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Recent sweeps</h2>
        {!sweeps || sweeps.length === 0 ? (
          <div className="text-sm text-slate-400">No sweeps run yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2">Started</th>
                  <th className="pb-2">Ended</th>
                  <th className="pb-2">Rows</th>
                  <th className="pb-2">Rendered</th>
                  <th className="pb-2">Failed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {(sweeps as SweepLogRow[]).map((s) => (
                  <tr key={s.id}>
                    <td className="py-2">{fmtDate(s.sweep_started_at)}</td>
                    <td className="py-2">{fmtDate(s.sweep_ended_at)}</td>
                    <td className="py-2">{s.total_rows ?? 0}</td>
                    <td className="py-2 text-emerald-300">{s.baked_count ?? 0}</td>
                    <td className="py-2 text-rose-300">{s.failed_count ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">Recent rows</h2>
        {!jobs || jobs.length === 0 ? (
          <div className="text-sm text-slate-400">No rows baked yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="pb-2">When</th>
                  <th className="pb-2">Table</th>
                  <th className="pb-2">Row</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Duration</th>
                  <th className="pb-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {(jobs as SweepJobRow[]).map((j) => (
                  <tr key={j.id} className="align-top">
                    <td className="py-2 whitespace-nowrap text-slate-400">{fmtDate(j.created_at)}</td>
                    <td className="py-2 font-mono text-xs">{j.source_table}</td>
                    <td className="py-2 font-mono text-xs text-slate-400">{j.row_id.slice(0, 8)}…</td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[j.status]}`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400">{fmtDuration(j.duration_ms)}</td>
                    <td className="py-2 text-xs text-slate-400">
                      {j.status === 'rendered'
                        ? <span className="text-emerald-300/80">{j.storage_path}</span>
                        : (j.error_message ?? '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
