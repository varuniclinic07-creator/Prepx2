'use client';
import { useState } from 'react';

export function RunSourceButton({ sourceId }: { sourceId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/research/run-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone(true);
      setTimeout(() => location.reload(), 800);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-emerald-400 text-xs">Queued</span>;
  return (
    <div className="flex items-center gap-2 justify-end">
      {err && <span className="text-rose-400 text-xs">{err}</span>}
      <button onClick={run} disabled={busy}
        className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 disabled:opacity-50 text-emerald-200 rounded text-xs">
        {busy ? '…' : 'Run now'}
      </button>
    </div>
  );
}
