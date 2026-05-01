'use client';
import { useState } from 'react';

export function ApproveButton({ scriptId }: { scriptId: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send(action: 'approve' | 'reject') {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/video/scripts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId, action }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone(action === 'approve' ? 'approved' : 'rejected');
      setTimeout(() => location.reload(), 600);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (done === 'approved') return <span className="text-emerald-400 text-xs">Queued for render</span>;
  if (done === 'rejected') return <span className="text-rose-400 text-xs">Rejected</span>;
  return (
    <div className="flex gap-2 items-center">
      <button onClick={() => send('approve')} disabled={busy}
        className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 disabled:opacity-50 text-emerald-200 rounded text-xs">
        Approve & render
      </button>
      <button onClick={() => send('reject')} disabled={busy}
        className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 disabled:opacity-50 text-rose-200 rounded text-xs">
        Reject
      </button>
      {err && <span className="text-rose-400 text-xs">{err}</span>}
    </div>
  );
}
