'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

export default function AdminNudgesPage() {
  const [nudges, setNudges] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { loadNudges(); }, []);

  const loadNudges = async () => {
    const { data } = await createClient().from('nudge_log').select('*').order('scheduled_at', { ascending: false }).limit(100);
    setNudges(data || []);
  };

  const deleteNudge = async (id: string) => {
    if (!confirm('Delete this nudge?')) return;
    const res = await fetch(`/api/admin/nudges/${id}`, { method: 'DELETE' });
    if (res.ok) { loadNudges(); setNotice('Deleted ✅'); }
    else setNotice('Delete failed ❌');
  };

  const createNudge = async (e: React.FormEvent) => {
    e.preventDefault(); setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from('nudge_log').insert({
      nudge_type: 'admin_broadcast', channel: 'push', status: 'pending',
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(), user_id: target === 'all' ? null : undefined,
    });
    if (error) { setNotice(`Error: ${error.message}`); }
    else {
      if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
        const { data: users } = await supabase.from('users').select('id');
        if (users && users.length > 0) {
          const inserts = users.map(u => ({ user_id: u.id, title, message, read: false }));
          const BATCH = 100;
          for (let i = 0; i < inserts.length; i += BATCH) {
            await supabase.from('user_notifications').insert(inserts.slice(i, i + BATCH));
          }
        }
      }
      setNotice('Nudge sent ✅'); setTitle(''); setMessage(''); setScheduledAt(''); loadNudges();
    }
    setSending(false); setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="space-y-6">
      {notice && <div className="text-center text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2">{notice}</div>}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Create Nudge</h2>
        <form onSubmit={createNudge} className="space-y-4">
          <div><label className="text-sm text-slate-400">Title</label><input value={title} onChange={e => setTitle(e.target.value)} required className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm mt-1" /></div>
          <div><label className="text-sm text-slate-400">Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} required rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm mt-1" /></div>
          <div className="flex gap-4">
            <div className="flex-1"><label className="text-sm text-slate-400">Target</label><select value={target} onChange={e => setTarget(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm mt-1"><option value="all">All Users</option><option value="premium">Premium Only</option><option value="premium_plus">Premium+ Only</option></select></div>
            <div className="flex-1"><label className="text-sm text-slate-400">Schedule</label><input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm mt-1" /></div>
          </div>
          <button type="submit" disabled={sending} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-lg text-sm transition">{sending ? 'Sending...' : 'Send Nudge'}</button>
        </form>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Scheduled</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-800">
            {nudges.map((n: any) => (
              <tr key={n.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{n.user_id?.slice(0,8) || 'ALL'}...</td>
                <td className="px-4 py-3 text-slate-200">{n.nudge_type}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${n.status==='sent'?'bg-emerald-500/20 text-emerald-400':n.status==='pending'?'bg-amber-500/20 text-amber-400':'bg-red-500/20 text-red-400'}`}>{n.status}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(n.scheduled_at).toLocaleString()}</td>
                <td className="px-4 py-3"><button onClick={() => deleteNudge(n.id)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button></td>
              </tr>
            ))}
            {nudges.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No nudges yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
