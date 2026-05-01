// Admin video pipeline (B2-3). List scripts/lectures, approve drafts, view render history.
import { createClient } from '@/lib/supabase-server';
import { ApproveButton } from './ApproveButton';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

export default async function AdminVideoPage() {
  const sb = await createClient();
  const [scripts, lectures, renderJobs] = await Promise.all([
    sb.from('video_scripts')
      .select('id, title, status, language, duration_target_seconds, flesch_kincaid_grade, created_at, topic_id')
      .order('created_at', { ascending: false }).limit(40),
    sb.from('video_lectures')
      .select('id, title, status, duration_seconds, published_at, created_at, script_id')
      .order('created_at', { ascending: false }).limit(40),
    sb.from('video_render_jobs')
      .select('id, status, started_at, ended_at, error_text, script_id, lecture_id')
      .order('created_at', { ascending: false }).limit(20),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Video Pipeline</h1>
      <p className="text-slate-400 text-sm">Astra Stream — script generation + render orchestration.</p>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Scripts ({scripts.data?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Lang</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">F-K</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {scripts.data && scripts.data.length > 0 ? scripts.data.map((s: any) => (
              <tr key={s.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-200">{s.title}</td>
                <td className="px-4 py-3 text-slate-400 text-xs uppercase">{s.language}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{Math.round((s.duration_target_seconds || 0) / 60)} min</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{s.flesch_kincaid_grade ?? '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${scriptBadge(s.status)}`}>{s.status}</span></td>
                <td className="px-4 py-3">
                  {s.status === 'draft' ? (
                    <ApproveButton scriptId={s.id} />
                  ) : <span className="text-slate-500 text-xs">—</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No scripts yet — POST to /api/admin/video/scripts to queue one.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Lectures ({lectures.data?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">View</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {lectures.data && lectures.data.length > 0 ? lectures.data.map((l: any) => (
              <tr key={l.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-200">{l.title}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{Math.round((l.duration_seconds || 0) / 60)} min</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${lectureBadge(l.status)}`}>{l.status}</span></td>
                <td className="px-4 py-3">
                  {l.status === 'published' ? (
                    <a href={`/lectures/${l.id}`} className="text-emerald-400 text-xs underline">Open</a>
                  ) : <span className="text-slate-500 text-xs">—</span>}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No lectures rendered yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Render jobs (last 20)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Ended</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {renderJobs.data && renderJobs.data.length > 0 ? renderJobs.data.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400 text-xs">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{r.ended_at ? new Date(r.ended_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${renderBadge(r.status)}`}>{r.status}</span></td>
                <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[28rem]">{r.error_text || '—'}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No render jobs logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function scriptBadge(status: string) {
  switch (status) {
    case 'approved': return 'bg-cyan-500/20 text-cyan-300';
    case 'rendering': return 'bg-amber-500/20 text-amber-300';
    case 'rendered': return 'bg-emerald-500/20 text-emerald-300';
    case 'published': return 'bg-emerald-500/20 text-emerald-300';
    case 'failed': return 'bg-rose-500/20 text-rose-300';
    case 'draft': return 'bg-slate-700 text-slate-300';
    default: return 'bg-slate-700 text-slate-400';
  }
}
function lectureBadge(status: string) {
  switch (status) {
    case 'published': return 'bg-emerald-500/20 text-emerald-300';
    case 'rendering': return 'bg-amber-500/20 text-amber-300';
    case 'encoding': return 'bg-cyan-500/20 text-cyan-300';
    case 'failed': return 'bg-rose-500/20 text-rose-300';
    case 'queued': return 'bg-slate-700 text-slate-300';
    default: return 'bg-slate-700 text-slate-400';
  }
}
function renderBadge(status: string) {
  switch (status) {
    case 'succeeded': return 'bg-emerald-500/20 text-emerald-300';
    case 'running': return 'bg-cyan-500/20 text-cyan-300';
    case 'failed': return 'bg-rose-500/20 text-rose-300';
    case 'queued': return 'bg-slate-700 text-slate-300';
    case 'cancelled': return 'bg-slate-700 text-slate-400';
    default: return 'bg-slate-700 text-slate-400';
  }
}
