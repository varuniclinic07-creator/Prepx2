'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Battle {
  id: string;
  initiator_id: string;
  status: 'pending' | 'active' | 'completed';
  duration_days: number;
  wager_coins: number;
  winner_id: string | null;
  created_at: string;
  ended_at: string | null;
}

interface Participant {
  battle_id: string;
  user_id: string;
  current_streak: number;
  best_streak: number;
}

export default function BattlesPage() {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [opponentEmail, setOpponentEmail] = useState('');
  const [wager, setWager] = useState(100);
  const [duration, setDuration] = useState(7);
  const [error, setError] = useState('');

  const fetchBattles = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myBattles } = await supabase
      .from('streak_battles')
      .select('*, battle_participants(*)')
      .or(`initiator_id.eq.${user.id},battle_participants.user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const battleList: Battle[] = [];
    const partList: Participant[] = [];
    (myBattles || []).forEach((b: any) => {
      battleList.push(b);
      (b.battle_participants || []).forEach((p: any) => partList.push(p));
    });
    setBattles(battleList);
    setParticipants(partList);
    setLoading(false);
  };

  useEffect(() => {
    fetchBattles();
    const interval = setInterval(fetchBattles, 5000);
    return () => clearInterval(interval);
  }, []);

  const createBattle = async () => {
    setError('');
    try {
      const res = await fetch('/api/battles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opponent_email: opponentEmail, wager_coins: wager, duration_days: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Create failed');
      setShowForm(false);
      setOpponentEmail('');
      fetchBattles();
    } catch (e: any) {
      setError(e.message || 'Failed to create battle');
    }
  };

  const acceptBattle = async (battleId: string) => {
    try {
      const res = await fetch('/api/battles/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battle_id: battleId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Accept failed');
      fetchBattles();
    } catch (e: any) {
      setError(e.message || 'Failed to accept battle');
    }
  };

  const myStreak = (battleId: string, userId?: string) => {
    const p = participants.find(x => x.battle_id === battleId && x.user_id === userId);
    return p?.current_streak ?? 0;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">⚔️ Streak Battles</h1>
        <button
          onClick={() => setShowForm(s => !s)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition"
        >
          {showForm ? 'Cancel' : 'New Challenge'}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Opponent email</label>
            <input
              type="email"
              value={opponentEmail}
              onChange={e => setOpponentEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Wager (coins)</label>
              <input
                type="number"
                min={10}
                value={wager}
                onChange={e => setWager(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Duration (days)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={createBattle}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition"
          >
            Create Challenge
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm text-center py-12">Loading battles...</div>
      ) : battles.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">No battles yet. Challenge a friend to a streak duel!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map(b => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                  b.status === 'active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                  b.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {b.status}
                </span>
                <span className="text-sm text-amber-400 font-bold">{b.wager_coins} 🪙</span>
              </div>
              <div className="text-sm text-slate-300">
                Duration: <span className="font-semibold text-slate-100">{b.duration_days} days</span>
              </div>
              {b.status === 'active' && (
                <div className="space-y-2">
                  {participants.filter(p => p.battle_id === b.id).map(p => (
                    <div key={p.user_id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                      <span className="text-sm text-slate-300">{p.user_id.slice(0, 8)}…</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Streak</span>
                        <span className="text-emerald-400 font-bold">{p.current_streak} 🔥</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {b.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptBattle(b.id)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition"
                  >
                    Accept Challenge
                  </button>
                </div>
              )}
              {b.status === 'completed' && b.winner_id && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <span className="text-emerald-400 font-bold text-sm">🏆 Winner: {b.winner_id.slice(0, 8)}…</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
