'use client';
import { DecisionButtons } from './DecisionButtons';

interface QualityFlag {
  code: string;
  severity: 'low' | 'med' | 'high';
  message: string;
}

interface RowShape {
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
}

export function RefineRow({ row, showActions }: { row: RowShape; showActions: boolean }) {
  const flags: QualityFlag[] = Array.isArray(row.flags) ? row.flags : [];
  const remediations: string[] = Array.isArray(row.remediations) ? row.remediations : [];
  const highCount = flags.filter((f) => f.severity === 'high').length;
  const medCount = flags.filter((f) => f.severity === 'med').length;
  const lowCount = flags.filter((f) => f.severity === 'low').length;

  const score = typeof row.quality_score === 'number' ? row.quality_score.toFixed(1) : '—';
  const fk = typeof row.readability_grade === 'number' ? row.readability_grade.toFixed(1) : '—';
  const cites = typeof row.citation_count === 'number' ? String(row.citation_count) : '—';
  const syll = typeof row.syllabus_alignment_score === 'number' ? `${Math.round(row.syllabus_alignment_score)}%` : '—';

  return (
    <tr className="hover:bg-slate-800/30 align-top">
      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
        {new Date(row.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-slate-300 text-xs">
        <div className="font-medium text-slate-200">{row.artifact_type.replace(/_/g, ' ')}</div>
        <div className="text-slate-500 font-mono">{row.artifact_id.slice(0, 8)}…</div>
        {row.retrigger_count > 0 && (
          <div className="text-slate-500">retrigger #{row.retrigger_count}</div>
        )}
      </td>
      <td className="px-4 py-3 text-slate-200 text-sm">
        <span className={scoreColor(row.quality_score)}>{score}</span>
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">{fk}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{cites}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{syll}</td>
      <td className="px-4 py-3 text-xs">
        <div className="flex gap-1 flex-wrap">
          {highCount > 0 && <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-200 rounded">{highCount} high</span>}
          {medCount > 0 && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-200 rounded">{medCount} med</span>}
          {lowCount > 0 && <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded">{lowCount} low</span>}
          {flags.length === 0 && <span className="text-slate-500">none</span>}
        </div>
        {flags.length > 0 && (
          <details className="mt-1 max-w-md">
            <summary className="text-slate-500 cursor-pointer hover:text-slate-300">details</summary>
            <ul className="mt-1 space-y-0.5 text-slate-400">
              {flags.slice(0, 8).map((f, i) => (
                <li key={i}><span className="text-slate-500">[{f.code}]</span> {f.message}</li>
              ))}
            </ul>
            {remediations.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-cyan-300/80">
                {remediations.slice(0, 4).map((r, i) => <li key={i}>→ {r}</li>)}
              </ul>
            )}
          </details>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${badgeFor(row.status)}`}>
          {row.status}
        </span>
        {row.admin_decision && (
          <div className="mt-1 text-xs text-slate-500">{row.admin_decision}</div>
        )}
      </td>
      {showActions && (
        <td className="px-4 py-3">
          <DecisionButtons auditId={row.id} />
        </td>
      )}
    </tr>
  );
}

function scoreColor(score: number | null): string {
  if (score === null) return 'text-slate-500';
  if (score >= 85) return 'text-emerald-300 font-semibold';
  if (score >= 70) return 'text-amber-300';
  return 'text-rose-300';
}

function badgeFor(status: string) {
  switch (status) {
    case 'passed':   return 'bg-emerald-500/20 text-emerald-300';
    case 'approved': return 'bg-cyan-500/20 text-cyan-300';
    case 'flagged':  return 'bg-amber-500/20 text-amber-200';
    case 'rejected': return 'bg-rose-500/20 text-rose-300';
    case 'running':  return 'bg-blue-500/20 text-blue-300';
    case 'queued':   return 'bg-slate-700 text-slate-300';
    default:         return 'bg-slate-700 text-slate-400';
  }
}
