'use client';
import { useState } from 'react';

export function ActionButton({
  shortId,
  action,
}: {
  shortId: string;
  action: 'approve' | 'reject' | 'regenerate';
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function fire() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/shorts/${shortId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone(action === 'regenerate' ? 'Queued' : `${action}d`);
      setTimeout(() => location.reload(), 600);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-emerald-400 text-xs">{done}</span>;

  const colors: Record<string, string> = {
    approve: 'bg-emerald-600 hover:bg-emerald-500',
    reject: 'bg-red-600 hover:bg-red-500',
    regenerate: 'bg-cyan-600 hover:bg-cyan-500',
  };

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={fire}
        disabled={busy}
        className={`text-xs text-white px-3 py-1 rounded ${colors[action]} disabled:opacity-50 transition`}
      >
        {action}
      </button>
      {err && <span className="text-rose-400 text-xs">{err}</span>}
    </div>
  );
}
