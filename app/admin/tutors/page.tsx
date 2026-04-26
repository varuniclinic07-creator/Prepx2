'use client';
import { useEffect, useState } from 'react';

interface Tutor { id: string; creator_user_id: string; name: string; subject: string; price: number; rating: number; subscriber_count: number; approved: boolean; }

export default function AdminTutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTutors(); }, []);

  const loadTutors = async () => {
    setLoading(true);
    const res = await fetch('/api/tutors/create');
    const d = await res.json();
    setTutors(d.tutors || []);
    setLoading(false);
  };

  const toggleApproval = async (id: string, approved: boolean) => {
    await fetch('/api/tutors/create', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, approved }) });
    setTutors(prev => prev.map(t => t.id === id ? { ...t, approved } : t));
  };

  const deleteTutor = async (id: string) => {
    if (!confirm('Delete this tutor?')) return;
    const res = await fetch(`/api/admin/tutors/${id}`, { method: 'DELETE' });
    if (res.ok) { loadTutors(); }
    else alert('Delete failed');
  };

  if (loading) return <div className="text-slate-300">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Tutor Marketplace</h1>
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
            <tr><th className="px-4 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Subject</th><th className="px-4 py-3 text-left">Price</th><th className="px-4 py-3 text-left">Rating</th><th className="px-4 py-3 text-left">Subs</th><th className="px-4 py-3 text-left">Approved</th><th className="px-4 py-3 text-left">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tutors.map(t => (
              <tr key={t.id} className="hover:bg-slate-800/50">
                <td className="px-4 py-3 text-slate-200">{t.name}</td>
                <td className="px-4 py-3 text-slate-400">{t.subject}</td>
                <td className="px-4 py-3 text-slate-200">₹{t.price}</td>
                <td className="px-4 py-3 text-slate-200">{t.rating}</td>
                <td className="px-4 py-3 text-slate-200">{t.subscriber_count}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleApproval(t.id, !t.approved)} className={`text-xs px-2 py-1 rounded ${t.approved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{t.approved ? 'Yes' : 'No'}</button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteTutor(t.id)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button>
                </td>
              </tr>
            ))}
            {tutors.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No tutors</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
