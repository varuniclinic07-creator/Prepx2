import { createClient } from '@/lib/supabase-server';
import { ActionButton } from './ActionButton';

export const dynamic = 'force-dynamic';

export default async function AdminShortsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="text-slate-400 p-8">Please log in as admin.</div>;

  const { data: rows, error } = await supabase
    .from('concept_shorts')
    .select('id, topic_id, concept_tag, title, style, render_status, approval_status, duration_seconds, user_id, created_at, voiceover_text')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="p-6 text-slate-100">
      <h1 className="text-2xl font-bold mb-1">Concept Shorts</h1>
      <p className="text-slate-400 text-sm mb-6">Admin review queue — approve, reject, or regenerate 120s topic shorts.</p>

      <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Topic</th>
              <th className="text-left p-3">Concept Tag</th>
              <th className="text-left p-3">Style</th>
              <th className="text-left p-3">Render</th>
              <th className="text-left p-3">Approval</th>
              <th className="text-left p-3">Duration</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(rows || []).map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-800/30 transition">
                <td className="p-3 text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td className="p-3 font-medium">{r.topic_id?.slice(0, 8)}...</td>
                <td className="p-3 text-cyan-400">{r.concept_tag}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.style === 'concept_explainer' ? 'bg-cyan-900/50 text-cyan-300' :
                    r.style === 'pyq_breaker' ? 'bg-amber-900/50 text-amber-300' :
                    r.style === 'mnemonic_visual' ? 'bg-purple-900/50 text-purple-300' :
                    'bg-emerald-900/50 text-emerald-300'
                  }`}>{r.style?.replace(/_/g, ' ')}</span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    r.render_status === 'rendered' ? 'bg-emerald-900/50 text-emerald-400' :
                    r.render_status === 'rendering' ? 'bg-amber-900/50 text-amber-400' :
                    r.render_status === 'failed' ? 'bg-red-900/50 text-red-400' :
                    'bg-blue-900/50 text-blue-400'
                  }`}>{r.render_status}</span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    r.approval_status === 'approved' ? 'bg-emerald-900/50 text-emerald-400' :
                    r.approval_status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{r.approval_status}</span>
                </td>
                <td className="p-3 text-slate-400">{r.duration_seconds}s</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <ActionButton shortId={r.id} action="approve" />
                    <ActionButton shortId={r.id} action="reject" />
                    <ActionButton shortId={r.id} action="regenerate" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
