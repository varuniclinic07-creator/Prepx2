'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

function useSquadsData() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/squads/leaderboard').then(r => r.json()).then(d => setLeaderboard(d.leaderboard || []));
    fetch('/api/squads/activity').then(r => r.json()).then(d => setActivity(d.activity || []));
  }, []);
  return { leaderboard, activity };
}

export default function SquadsPage() {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('polity');
  const [invite, setInvite] = useState('');
  const [result, setResult] = useState('');
  const { leaderboard, activity } = useSquadsData();

  const supabase = createClient();

  const createSquad = async () => {
    if (!name.trim()) { setResult('Enter squad name'); return; }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setResult('Login required'); return; }
    const { error } = await supabase.from('squads').insert({ name, subject, invite_code: code, created_by: user.id });
    setResult(error ? `Error: ${error.message}` : `Squad created! Invite code: ${code}`);
  };

  const joinSquad = async () => {
    if (!invite.trim()) { setResult('Enter invite code'); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setResult('Login required'); return; }
    const { data: squad } = await supabase.from('squads').select('id').eq('invite_code', invite.trim().toUpperCase()).single();
    if (!squad) { setResult('Invalid code'); return; }
    const { error } = await supabase.from('squad_members').insert({ squad_id: squad.id, user_id: user.id, role: 'member' });
    setResult(error ? `Error: ${error.message}` : 'Joined squad!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Study Squads</h1>
        <p className="text-slate-400">Compete and learn together with fellow aspirants.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Create Squad</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Squad name" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500" />
        <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100">
          <option value="polity">Polity</option>
          <option value="history">History</option>
          <option value="economy">Economy</option>
          <option value="ethics-aptitude">Ethics</option>
          <option value="csat-comprehension">CSAT</option>
        </select>
        <button onClick={createSquad} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition">Create</button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Join Squad</h2>
        <input value={invite} onChange={e => setInvite(e.target.value)} placeholder="Invite code" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
        <button onClick={joinSquad} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg transition">Join</button>
      </div>

      {result && <div className="text-sm text-slate-300">{result}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <p className="text-sm text-slate-500">No squads yet.</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((squad: any, i: number) => (
              <div key={squad.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">#{i + 1}</span>
                  <span className="font-semibold text-slate-200">{squad.name}</span>
                  <span className="text-xs text-slate-500">({squad.subject})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">{squad.members} members</span>
                  <span className="text-amber-400 font-bold">{squad.totalCoins} 🪙</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Activity Feed</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-slate-500">No recent activity.</p>
        ) : (
          <div className="space-y-2">
            {activity.map((a: any, i: number) => (
              <div key={i} className="text-sm text-slate-300 bg-slate-800 rounded-lg p-3">
                {a.message}
                <span className="text-xs text-slate-500 ml-2">{new Date(a.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
