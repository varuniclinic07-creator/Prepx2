'use client';
import { useState } from 'react';

export function DecisionButtons({ auditId }: { auditId: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function send(action: 'approve' | 'reject' | 'regenerate', notes?: string) {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/refine/${auditId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone(action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Regen queued');
      setTimeout(() => location.reload(), 700);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  function approve() { void send('approve'); }
  function reject() {
    const reason = prompt('Why reject?');
    if (!reason || reason.trim().length === 0) return;
    void send('reject', reason);
  }
  function regenerate() { void send('regenerate'); }

  if (done) return <span className="text-emerald-400 text-xs">{done}</span>;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <button onClick={approve} disabled={busy}
        className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 disabled:opacity-50 text-emerald-200 rounded text-xs">
        Approve
      </button>
      <button onClick={reject} disabled={busy}
        className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 disabled:opacity-50 text-rose-200 rounded text-xs">
        Reject
      </button>
      <button onClick={regenerate} disabled={busy}
        className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 disabled:opacity-50 text-cyan-200 rounded text-xs">
        Regenerate
      </button>
      {err && <span className="text-rose-400 text-xs">{err}</span>}
    </div>
  );
}
