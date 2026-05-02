'use client';

// Topic-page wrapper for the 3D mindmap. Lazy-loads Mindmap3D so the heavy
// R3F bundle only ships when a mindmap actually exists for the topic. Admins
// see a "Generate" button when none is found.

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { MindmapDoc, MindmapNodeDoc } from './Mindmap3D';

const Mindmap3D = dynamic(
  () => import('./Mindmap3D').then(m => m.Mindmap3D),
  { ssr: false, loading: () => <div className="text-slate-500 text-sm">Loading 3D mindmap…</div> },
);

export interface MindmapSectionProps {
  topicId: string;
  isAdmin: boolean;
  initialMindmap: MindmapDoc | null;
  initialNodes: MindmapNodeDoc[];
}

export function MindmapSection({ topicId, isAdmin, initialMindmap, initialNodes }: MindmapSectionProps) {
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setQueued(true);
    } catch (e: any) {
      setErr(e?.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  if (initialMindmap && initialNodes.length > 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-100 border-t border-slate-800 pt-6">
          Mindmap
        </h2>
        <div className="text-sm text-slate-400">{initialMindmap.title}</div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ height: 520 }}>
          <Mindmap3D mindmap={initialMindmap} nodes={initialNodes} />
        </div>
        <p className="text-xs text-slate-500">
          Drag to rotate · scroll to zoom · click a node to focus, hover for summary.
        </p>
      </section>
    );
  }

  if (!isAdmin) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-100 border-t border-slate-800 pt-6">
        Mindmap
      </h2>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-sm text-slate-400">
        No mindmap yet for this topic.
        {queued ? (
          <span className="ml-2 text-emerald-300">Queued ✓ — refresh in a minute.</span>
        ) : (
          <button
            onClick={generate}
            disabled={busy}
            className="ml-3 text-xs px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busy ? '…' : 'Generate mindmap'}
          </button>
        )}
        {err && <span className="ml-3 text-rose-400">{err}</span>}
      </div>
    </section>
  );
}
