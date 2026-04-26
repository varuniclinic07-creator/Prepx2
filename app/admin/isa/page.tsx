'use client';

import { useEffect, useState } from 'react';

interface IsaContract {
  id: string;
  user_id: string;
  status: string;
  prelims_cleared: boolean;
  mains_cleared: boolean;
  final_selected: boolean;
  total_due: number;
  enrollment_date: string;
}

export default function AdminIsaPage() {
  const [contracts, setContracts] = useState<IsaContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, []);

  async function loadContracts() {
    setLoading(true);
    const res = await fetch('/api/isa/list', { method: 'GET' });
    const c = await res.json();
    setContracts(Array.isArray(c) ? c : []);
    setLoading(false);
  }

  async function triggerMilestone(contractId: string, milestone: string, field: string) {
    const res = await fetch('/api/isa/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId, milestone })
    });
    const data = await res.json();
    if (data.orderId) {
      alert(`Order ${data.orderId} created for ${milestone}`);
    } else {
      alert(data.error || 'Failed to create order');
    }
  }

  if (loading) return <div className="text-slate-300">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">ISA Contracts</h1>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Prelims</th>
              <th className="px-4 py-3 text-left">Mains</th>
              <th className="px-4 py-3 text-left">Final</th>
              <th className="px-4 py-3 text-left">Due</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {contracts.map(c => (
              <tr key={c.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 font-mono text-slate-300">{c.user_id.slice(0,8)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${c.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  <MilestoneCell done={c.prelims_cleared} label="prelims" contractId={c.id} onTrigger={triggerMilestone} />
                </td>
                <td className="px-4 py-3">
                  <MilestoneCell done={c.mains_cleared} label="mains" contractId={c.id} onTrigger={triggerMilestone} />
                </td>
                <td className="px-4 py-3">
                  <MilestoneCell done={c.final_selected} label="final" contractId={c.id} onTrigger={triggerMilestone} />
                </td>
                <td className="px-4 py-3 text-slate-200 font-mono">₹{c.total_due.toLocaleString()}</td>
                <td className="px-4 py-3 space-x-2">
                  <button onClick={() => triggerMilestone(c.id, 'prelims', 'prelims_cleared')} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Prelims</button>
                  <button onClick={() => triggerMilestone(c.id, 'mains', 'mains_cleared')} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Mains</button>
                  <button onClick={() => triggerMilestone(c.id, 'final', 'final_selected')} className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600">Final</button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No contracts yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MilestoneCell({ done, label, contractId, onTrigger }: { done: boolean; label: string; contractId: string; onTrigger: (id: string, m: string, f: string) => void }) {
  if (done) return <span className="text-emerald-400 text-xs font-bold">✓</span>;
  return (
    <button onClick={() => onTrigger(contractId, label, `${label}_cleared`)} className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700">
      Mark
    </button>
  );
}
