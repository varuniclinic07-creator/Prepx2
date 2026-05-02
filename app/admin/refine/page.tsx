// Admin Content Refiner queue (Sprint 2, Epic 3.2).
// Lists artifact_quality_audits awaiting decision (running/flagged/passed/
// rejected) so admins can approve, reject, or regenerate the underlying
// artifact (lecture_script | smart_book_chapter | research_article |
// quiz_question).

import { createClient } from '@/lib/supabase-server';
import { RefineRow } from './RefineRow';

export const dynamic = 'force-dynamic';
export const revalidate = 30;

type AuditListItem = {
  id: string;
  artifact_type: string;
  artifact_id: string;
  status: string;
  quality_score: number | null;
  readability_grade: number | null;
  citation_count: number | null;
  syllabus_alignment_score: number | null;
  flags: any;
  remediations: any;
  admin_decision: string | null;
  admin_notes: string | null;
  decided_at: string | null;
  retrigger_count: number;
  created_at: string;
};

export default async function AdminRefinePage() {
  const sb = await createClient();

  const baseSelect = 'id, artifact_type, artifact_id, status, quality_score, readability_grade, citation_count, syllabus_alignment_score, flags, remediations, admin_decision, admin_notes, decided_at, retrigger_count, created_at';

  const [pending, recentDecided, inFlight] = await Promise.all([
    sb.from('artifact_quality_audits')
      .select(baseSelect)
      .in('status', ['flagged', 'rejected', 'passed'])
      .is('admin_decision', null)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('artifact_quality_audits')
      .select(baseSelect)
      .not('admin_decision', 'is', null)
      .order('decided_at', { ascending: false })
      .limit(20),
    sb.from('artifact_quality_audits')
      .select(baseSelect)
      .in('status', ['queued', 'running'])
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const renderTable = (rows: AuditListItem[] | null, emptyHint: string, showDecisionCol = true) => (
    <table className="w-full text-sm">
      <thead className="bg-slate-800/50 text-slate-400 text-left">
        <tr>
          <th className="px-4 py-3">When</th>
          <th className="px-4 py-3">Artifact</th>
          <th className="px-4 py-3">Score</th>
          <th className="px-4 py-3">F-K</th>
          <th className="px-4 py-3">Cites</th>
          <th className="px-4 py-3">Syllabus</th>
          <th className="px-4 py-3">Flags</th>
          <th className="px-4 py-3">Status</th>
          {showDecisionCol && <th className="px-4 py-3">Action</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800">
        {rows && rows.length > 0 ? rows.map((r) => (
          <RefineRow key={r.id} row={r as any} showActions={showDecisionCol} />
        )) : (
          <tr><td colSpan={showDecisionCol ? 9 : 8} className="px-4 py-8 text-center text-slate-500">{emptyHint}</td></tr>
        )}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Content Refiner</h1>
      <p className="text-slate-400 text-sm">
        Second-pass quality audits from the content-verifier agent. Each row covers one generated artifact
        (lecture script, smart-book chapter, research article, or quiz question). Approve to accept and
        publish downstream, reject to bin, or regenerate to spawn a fresh primary-agent job.
      </p>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Pending decision ({pending.data?.length ?? 0})
          </h2>
        </div>
        {renderTable(pending.data as any, 'No artifacts awaiting your decision.')}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            In-flight verifications ({inFlight.data?.length ?? 0})
          </h2>
        </div>
        {renderTable(inFlight.data as any, 'No verifications running.', false)}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Recently decided ({recentDecided.data?.length ?? 0})
          </h2>
        </div>
        {renderTable(recentDecided.data as any, 'No decisions yet.', false)}
      </section>
    </div>
  );
}
