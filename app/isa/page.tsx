'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IsaContract {
  id: string;
  status: string;
  prelims_cleared: boolean;
  mains_cleared: boolean;
  final_selected: boolean;
  total_due: number;
  enrollment_date: string;
}

export default function IsaPage() {
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [reason, setReason] = useState('');
  const [contract, setContract] = useState<IsaContract | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/isa/enroll', { method: 'GET' })
      .then(r => r.json())
      .then(data => {
        setLoading(false);
        if (data.contract) setContract(data.contract);
        if (data.eligible !== undefined) {
          setEligible(data.eligible);
          if (!data.eligible) setReason(data.reason || '');
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleEnroll = async () => {
    if (!agreed) return;
    setEnrolling(true);
    const res = await fetch('/api/isa/enroll', { method: 'POST' });
    const data = await res.json();
    if (data.contract) {
      setContract(data.contract);
      setEligible(false);
    }
    setEnrolling(false);
  };

  if (loading) return <div className="text-slate-300 text-center py-12">Checking eligibility…</div>;

  if (contract) {
    const milestones = [
      { label: 'Prelims Cleared', done: contract.prelims_cleared, amount: 2999 },
      { label: 'Mains Cleared', done: contract.mains_cleared, amount: 4999 },
      { label: 'Final Selected', done: contract.final_selected, amount: 9999 },
    ];
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">Vijay Guarantee Contract</h1>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Status</span>
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${contract.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : contract.status === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'}`}>{contract.status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Enrolled</span>
            <span className="text-sm text-slate-200">{new Date(contract.enrollment_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Total Due</span>
            <span className="text-lg font-bold text-slate-100">₹{contract.total_due.toLocaleString()}</span>
          </div>
          <div className="space-y-2 pt-2">
            {milestones.map(m => (
              <div key={m.label} className="flex items-center justify-between py-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${m.done ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  <span className="text-sm text-slate-300">{m.label}</span>
                </div>
                <span className="text-sm font-mono text-slate-400">₹{m.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="max-w-xl mx-auto text-center space-y-4 py-12">
        <h1 className="text-2xl font-bold text-slate-100">Vijay Guarantee</h1>
        <p className="text-slate-400">Pay ₹0 upfront. Pay only when you clear.</p>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-300 text-sm">
          Not eligible: {reason || 'You do not meet the criteria yet.'}
        </div>
        <Link href="/pricing" className="text-sm text-emerald-400 hover:text-emerald-300">Explore other plans →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">Vijay Guarantee</h1>
        <p className="text-slate-400">Pay ₹0 upfront. Pay only when you clear.</p>
      </div>
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-emerald-400">You are eligible!</h2>
        <ul className="text-sm text-slate-300 space-y-2">
          <li className="flex items-start gap-2"><span className="text-emerald-400">✓</span>Prediction confidence ≥ 60%</li>
          <li className="flex items-start gap-2"><span className="text-emerald-400">✓</span>Rank ≥ Collector</li>
        </ul>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Terms</h3>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li>₹2,999 upon Prelims clearance</li>
          <li>₹4,999 upon Mains clearance</li>
          <li>₹9,999 upon final selection</li>
          <li>Total maximum: ₹17,997</li>
        </ul>
        <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-emerald-500" />
          I agree to the Vijay Guarantee terms and understand my payment obligations.
        </label>
        <button
          onClick={handleEnroll}
          disabled={!agreed || enrolling}
          className="w-full py-2.5 rounded-xl font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 transition"
        >
          {enrolling ? 'Enrolling…' : 'Enroll Now'}
        </button>
      </div>
    </div>
  );
}
