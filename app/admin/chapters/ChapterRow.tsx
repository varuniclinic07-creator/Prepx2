'use client';
import { ApproveButton } from './ApproveButton';

interface RowShape {
  id: string;
  topic_id: string;
  title: string;
  chapter_num: number;
  version: number;
  flesch_kincaid_grade: number;
  source_citations: any[];
  mnemonics: any[];
  mock_questions: any[];
  status: string;
  rejected_reason: string | null;
  created_at: string;
  topics?: { title: string | null } | null;
}

export function ChapterRow({ row }: { row: RowShape }) {
  const citationsCount = Array.isArray(row.source_citations) ? row.source_citations.length : 0;
  const mcqCount = Array.isArray(row.mock_questions) ? row.mock_questions.length : 0;
  const topicTitle = row.topics?.title || row.topic_id.slice(0, 8);
  const fk = typeof row.flesch_kincaid_grade === 'number'
    ? Number(row.flesch_kincaid_grade).toFixed(1)
    : '—';

  return (
    <tr className="hover:bg-slate-800/30 align-top">
      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
        {new Date(row.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-slate-300 text-xs">
        <div className="font-medium text-slate-200">{topicTitle}</div>
        <div className="text-slate-500">ch {row.chapter_num} · v{row.version}</div>
      </td>
      <td className="px-4 py-3 text-slate-200">
        <div className="font-medium">{row.title}</div>
        {row.rejected_reason && (
          <div className="mt-1 text-xs text-rose-400 max-w-md">{row.rejected_reason}</div>
        )}
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">{fk}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{citationsCount}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{mcqCount}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeFor(row.status)}`}>
          {row.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <ApproveButton chapterId={row.id} topicId={row.topic_id} status={row.status} />
      </td>
    </tr>
  );
}

function badgeFor(status: string) {
  switch (status) {
    case 'published': return 'bg-emerald-500/20 text-emerald-300';
    case 'approved': return 'bg-cyan-500/20 text-cyan-300';
    case 'generated_pending_approval': return 'bg-amber-500/20 text-amber-200';
    case 'rejected': return 'bg-rose-500/20 text-rose-300';
    case 'draft': return 'bg-slate-700 text-slate-300';
    default: return 'bg-slate-700 text-slate-400';
  }
}
