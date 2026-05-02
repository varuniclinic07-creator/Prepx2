// Admin Smart Book chapters review queue (Sprint 2, Epic 16.2).
// Lists chapters awaiting approval (status='generated_pending_approval'), as
// well as rejected/draft chapters that admins may want to regenerate.

import { createClient } from '@/lib/supabase-server';
import { ChapterRow } from './ChapterRow';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

type ChapterListItem = {
  id: string;
  topic_id: string;
  title: string;
  chapter_num: number;
  version: number;
  flesch_kincaid_grade: number;
  source_citations: any;
  mnemonics: any;
  mock_questions: any;
  status: string;
  rejected_reason: string | null;
  created_at: string;
  topics?: { title: string | null } | null;
};

export default async function AdminChaptersPage() {
  const sb = await createClient();

  const [pending, drafts, recent] = await Promise.all([
    sb.from('chapters')
      .select('id, topic_id, title, chapter_num, version, flesch_kincaid_grade, source_citations, mnemonics, mock_questions, status, rejected_reason, created_at, topics(title)')
      .eq('status', 'generated_pending_approval')
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('chapters')
      .select('id, topic_id, title, chapter_num, version, flesch_kincaid_grade, source_citations, mnemonics, mock_questions, status, rejected_reason, created_at, topics(title)')
      .in('status', ['draft', 'rejected'])
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('chapters')
      .select('id, topic_id, title, chapter_num, version, flesch_kincaid_grade, source_citations, mnemonics, mock_questions, status, rejected_reason, created_at, topics(title)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const renderTable = (rows: ChapterListItem[] | null, emptyHint: string) => (
    <table className="w-full text-sm">
      <thead className="bg-slate-800/50 text-slate-400 text-left">
        <tr>
          <th className="px-4 py-3">When</th>
          <th className="px-4 py-3">Topic</th>
          <th className="px-4 py-3">Chapter</th>
          <th className="px-4 py-3">F-K</th>
          <th className="px-4 py-3">Citations</th>
          <th className="px-4 py-3">MCQs</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {rows && rows.length > 0 ? rows.map((r) => (
          <ChapterRow key={r.id} row={r as any} />
        )) : (
          <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-500">{emptyHint}</td></tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Smart Book Chapters</h1>
      <p className="text-slate-400 text-sm">
        Auto-generated chapters from the chapter-writer agent. Approve to publish, reject with reason, or regenerate to spawn a fresh content-job for the topic.
      </p>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Pending approval ({pending.data?.length ?? 0})
          </h2>
        </div>
        {renderTable(pending.data as any, 'No chapters awaiting approval. Cascade triggers when research articles link to a topic.')}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Drafts &amp; rejections ({drafts.data?.length ?? 0})
          </h2>
        </div>
        {renderTable(drafts.data as any, 'No drafts or rejections.')}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Recently published ({recent.data?.length ?? 0})
          </h2>
        </div>
        {renderTable(recent.data as any, 'Nothing published yet.')}
      </section>
    </div>
  );
}
