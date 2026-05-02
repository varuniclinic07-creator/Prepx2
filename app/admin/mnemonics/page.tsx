// Admin Mnemonic Engine v2 review queue (Sprint 3, S3-1).
// Lists mnemonic_artifacts joined to topics. Each row shows style, render
// status, and a regenerate button that enqueues a fresh mnemonic-job.

import { createClient } from '@/lib/supabase-server';
import { MnemonicRow } from './MnemonicRow';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

type MnemonicListItem = {
  id: string;
  topic_id: string;
  user_id: string | null;
  topic_query: string;
  style: 'acronym' | 'story' | 'rhyme' | 'visual';
  text: string;
  explanation: string;
  render_status: string;
  generated_by: string;
  created_at: string;
  topics?: { title: string | null } | null;
};

export default async function AdminMnemonicsPage(
  { searchParams }: { searchParams: Promise<{ topic?: string }> },
) {
  const sb = await createClient();
  const params = await searchParams;
  const topicFilter = params?.topic || null;

  const baseSelect =
    'id, topic_id, user_id, topic_query, style, text, explanation, render_status, generated_by, created_at, topics(title)';

  let recentQuery = sb.from('mnemonic_artifacts')
    .select(baseSelect)
    .order('created_at', { ascending: false })
    .limit(50);
  if (topicFilter) recentQuery = recentQuery.eq('topic_id', topicFilter);

  const { data: recent } = await recentQuery;

  const renderTable = (rows: MnemonicListItem[] | null, emptyHint: string) => (
    <table className="w-full text-sm">
      <thead className="bg-slate-800/50 text-slate-400 text-left">
        <tr>
          <th className="px-4 py-3">When</th>
          <th className="px-4 py-3">Topic</th>
          <th className="px-4 py-3">Style</th>
          <th className="px-4 py-3">Text</th>
          <th className="px-4 py-3">Render</th>
          <th className="px-4 py-3">Owner</th>
          <th className="px-4 py-3">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {rows && rows.length > 0 ? rows.map((r) => (
          <MnemonicRow key={r.id} row={r as any} />
        )) : (
          <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{emptyHint}</td></tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Mnemonic Engine v2</h1>
      <p className="text-slate-400 text-sm">
        Auto-generated mnemonics with embedded 3D scenes. Each topic ships with up to four
        styles (acronym, story, rhyme, visual). Free-tier users see only acronym + visual.
        Use Regenerate to spawn a fresh mnemonic-job for the public catalog.
      </p>

      {topicFilter && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-400">
          Filtered by topic_id: <span className="font-mono text-slate-300">{topicFilter}</span>
          {' · '}
          <a href="/admin/mnemonics" className="text-emerald-400 hover:underline">Clear</a>
        </div>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">
            Recent ({recent?.length ?? 0})
          </h2>
        </div>
        {renderTable(recent as any, 'No mnemonics yet. Regenerate from a topic to populate the catalog.')}
      </section>
    </div>
  );
}
