'use client';
import { useState } from 'react';

export function ApproveButton({
  chapterId,
  topicId,
  status,
}: {
  chapterId: string;
  topicId: string;
  status: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function approve() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone('Published');
      setTimeout(() => location.reload(), 600);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    const reason = prompt('Why is this chapter being rejected?');
    if (!reason || reason.trim().length === 0) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone('Rejected');
      setTimeout(() => location.reload(), 600);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function regenerate() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/admin/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setDone(`Queued (task ${String(body.taskId).slice(0, 8)})`);
      setTimeout(() => location.reload(), 800);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="text-emerald-400 text-xs">{done}</span>;

  const canApprove = status === 'generated_pending_approval' || status === 'approved';
  const canReject  = status === 'generated_pending_approval' || status === 'draft';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {canApprove && (
        <button onClick={approve} disabled={busy}
          className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 disabled:opacity-50 text-emerald-200 rounded text-xs">
          Approve & publish
        </button>
      )}
      {canReject && (
        <button onClick={reject} disabled={busy}
          className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 disabled:opacity-50 text-rose-200 rounded text-xs">
          Reject
        </button>
      )}
      <button onClick={regenerate} disabled={busy}
        className="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 disabled:opacity-50 text-cyan-200 rounded text-xs">
        Regenerate
      </button>
      {err && <span className="text-rose-400 text-xs">{err}</span>}
    </div>
  );
}
