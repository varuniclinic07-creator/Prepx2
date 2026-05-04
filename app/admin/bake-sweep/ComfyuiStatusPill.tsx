'use client';

import { useEffect, useState } from 'react';

interface StatusResponse {
  connected: boolean;
  reason?: string;
  host?: string;
  port?: number;
  running?: number;
  pending?: number;
  queue_length?: number;
}

export default function ComfyuiStatusPill() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/comfyui/status', { cache: 'no-store' });
      const json = (await res.json()) as StatusResponse;
      setStatus(json);
    } catch (err: any) {
      setStatus({ connected: false, reason: err?.message || 'fetch failed' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const dotColor = status?.connected ? 'bg-emerald-400' : 'bg-rose-400';
  const ring = status?.connected ? 'ring-emerald-500/30' : 'ring-rose-500/30';

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 ring-1 ${ring}`}>
      <span className={`relative flex h-2.5 w-2.5`}>
        <span className={`absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping ${dotColor}`} />
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
      </span>
      <div className="flex-1 text-sm">
        <div className="font-semibold text-slate-100">
          ComfyUI {status?.connected ? 'online' : 'offline'}
        </div>
        <div className="text-xs text-slate-400">
          {loading ? 'checking…' : status?.connected
            ? `${status.host}:${status.port} • ${status.queue_length ?? 0} jobs queued (${status.running ?? 0} running, ${status.pending ?? 0} pending)`
            : (status?.reason || 'unreachable')}
        </div>
      </div>
      <button
        type="button"
        onClick={refresh}
        disabled={loading}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-50"
      >
        Recheck
      </button>
    </div>
  );
}
