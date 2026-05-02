'use client';
import { useState } from 'react';

export function RegenerateButton({ topicId, chapterId }: { topicId: string; chapterId?: string | null }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/mindmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, chapterId: chapterId || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setDone(true);
    } catch (e: any) {
      setErr(e?.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-xs text-emerald-300">queued ✓</span>;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={go}
        disabled={busy}
        className="text-xs px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-50"
      >
        {busy ? '…' : 'Regenerate'}
      </button>
      {err && <span className="text-xs text-rose-400">{err}</span>}
    </div>
  );
}
