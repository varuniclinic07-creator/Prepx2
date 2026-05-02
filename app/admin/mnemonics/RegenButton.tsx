'use client';
import { useState } from 'react';

export function RegenButton({ topicId }: { topicId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/mnemonics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone(`Queued (${String(body.taskId).slice(0, 8)})`);
      setTimeout(() => location.reload(), 800);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-emerald-400 text-xs">{done}</span>;

  return (
    <div className="flex items-center gap-2">
      <button onClick={regenerate} disabled={busy}
        className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 disabled:opacity-50 text-cyan-200 rounded text-xs">
        Regenerate
      </button>
      {err && <span className="text-rose-400 text-xs">{err}</span>}
    </div>
  );
}
