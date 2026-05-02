'use client';
import { RegenButton } from './RegenButton';

interface RowShape {
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
}

const STYLE_PILLS: Record<string, string> = {
  acronym: 'bg-cyan-500/20 text-cyan-300',
  story:   'bg-saffron-500/20 text-amber-300',
  rhyme:   'bg-magenta-500/20 text-fuchsia-300',
  visual:  'bg-emerald-500/20 text-emerald-300',
};

const RENDER_PILLS: Record<string, string> = {
  r3f_only:  'bg-slate-700 text-slate-300',
  queued:    'bg-amber-500/20 text-amber-200',
  rendering: 'bg-cyan-500/20 text-cyan-300',
  rendered:  'bg-emerald-500/20 text-emerald-300',
  failed:    'bg-rose-500/20 text-rose-300',
};

export function MnemonicRow({ row }: { row: RowShape }) {
  const topicTitle = row.topics?.title || row.topic_query || row.topic_id.slice(0, 8);
  const owner = row.user_id ? `user ${row.user_id.slice(0, 8)}` : 'catalog';

  return (
    <tr className="hover:bg-slate-800/30 align-top">
      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
        {new Date(row.created_at).toLocaleString()}
      </td>
      <td className="px-4 py-3 text-slate-300 text-xs">
        <div className="font-medium text-slate-200">{topicTitle}</div>
        <div className="font-mono text-slate-500">{row.topic_id.slice(0, 8)}…</div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STYLE_PILLS[row.style] || 'bg-slate-700 text-slate-300'}`}>
          {row.style}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-200 max-w-md">
        <div className="text-sm">{row.text.length > 140 ? row.text.slice(0, 140) + '…' : row.text}</div>
        {row.explanation && (
          <div className="mt-1 text-xs text-slate-500 line-clamp-2">{row.explanation}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${RENDER_PILLS[row.render_status] || 'bg-slate-700 text-slate-400'}`}>
          {row.render_status}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{owner}</td>
      <td className="px-4 py-3">
        <RegenButton topicId={row.topic_id} />
      </td>
    </tr>
  );
}
