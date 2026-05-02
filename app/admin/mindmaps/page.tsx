// Admin Animated Mindmaps queue (Sprint 3 / S3-3).
// Lists animated_mindmaps with status pill + node count + regenerate.
// Filter by ?topicId=... or ?status=ready|generating|failed.

import { createClient } from '@/lib/supabase-server';
import { RegenerateButton } from './RegenerateButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_STATUSES = new Set(['generating', 'ready', 'failed']);

interface MindmapRow {
  id: string;
  topic_id: string | null;
  chapter_id: string | null;
  title: string;
  layout: string;
  status: string;
  generated_by: string;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
  topics?: { title: string | null } | null;
  chapters?: { title: string | null; chapter_num: number | null } | null;
}

function badgeFor(status: string) {
  switch (status) {
    case 'ready':      return 'bg-emerald-500/20 text-emerald-300';
    case 'generating': return 'bg-amber-500/20 text-amber-200';
    case 'failed':     return 'bg-rose-500/20 text-rose-300';
    default:           return 'bg-slate-700 text-slate-300';
  }
}

export default async function AdminMindmapsPage({
  searchParams,
}: {
  searchParams: Promise<{ topicId?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const sb = await createClient();

  let q = sb.from('animated_mindmaps')
    .select('id, topic_id, chapter_id, title, layout, status, generated_by, preview_url, created_at, updated_at, topics(title), chapters(title, chapter_num)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (sp.topicId) q = q.eq('topic_id', sp.topicId);
  if (sp.status && ALLOWED_STATUSES.has(sp.status)) q = q.eq('status', sp.status);

  const { data: rows } = await q;
  const list = (rows || []) as unknown as MindmapRow[];

  // Node counts in one query.
  const nodeCounts: Record<string, number> = {};
  if (list.length > 0) {
    const ids = list.map(r => r.id);
    const { data: nc } = await sb.from('mindmap_nodes').select('mindmap_id').in('mindmap_id', ids);
    for (const r of nc || []) {
      const k = r.mindmap_id as string;
      nodeCounts[k] = (nodeCounts[k] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Animated Mindmaps</h1>
        <p className="text-slate-400 text-sm mt-1">
          3D node graphs generated per chapter / topic. Render uses R3F on the topic page.
        </p>
      </div>

      <div className="flex gap-2 text-xs">
        <a href="/admin/mindmaps" className={`px-3 py-1 rounded-full border ${!sp.status ? 'bg-slate-100 text-slate-900 border-slate-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>All</a>
        <a href="/admin/mindmaps?status=ready" className={`px-3 py-1 rounded-full border ${sp.status === 'ready' ? 'bg-emerald-400 text-slate-900 border-emerald-400' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>Ready</a>
        <a href="/admin/mindmaps?status=generating" className={`px-3 py-1 rounded-full border ${sp.status === 'generating' ? 'bg-amber-300 text-slate-900 border-amber-300' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>Generating</a>
        <a href="/admin/mindmaps?status=failed" className={`px-3 py-1 rounded-full border ${sp.status === 'failed' ? 'bg-rose-400 text-slate-900 border-rose-400' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>Failed</a>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Mindmaps ({list.length})
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Topic / Chapter</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Layout</th>
              <th className="px-4 py-3">Nodes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No mindmaps yet. Use the topic page or the Regenerate action below to enqueue one.
                </td>
              </tr>
            ) : list.map(row => (
              <tr key={row.id} className="hover:bg-slate-800/30 align-top">
                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">
                  <div className="font-medium text-slate-200">
                    {row.topics?.title || row.topic_id?.slice(0, 8) || '—'}
                  </div>
                  {row.chapters?.title && (
                    <div className="text-slate-500">
                      ch {row.chapters.chapter_num} · {row.chapters.title}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-200">{row.title}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{row.layout}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{nodeCounts[row.id] || 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeFor(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {row.topic_id && (
                    <RegenerateButton topicId={row.topic_id} chapterId={row.chapter_id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
