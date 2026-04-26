'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { broadcastMessage } from '@/lib/telegram-bot';

export default function AdminBotPage() {
  const [count, setCount] = useState(0);
  const [broadcast, setBroadcast] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    supabase.from('user_telegrams').select('*', { count: 'exact', head: true }).then(({ count }) => setCount(count || 0));
  }, []);

  const handleBroadcast = async () => {
    if (!broadcast.trim()) return;
    setStatus('Sending...');
    const res = await broadcastMessage(broadcast.trim());
    setStatus(`Sent to ${res.sent} users`);
    setBroadcast('');
  };

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-slate-100">🤖 Telegram Bot</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
          <div className="text-3xl font-bold text-emerald-400">{count}</div>
          <div className="text-sm text-slate-400 mt-1">Connected Users</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Broadcast Message</h2>
        <textarea
          value={broadcast}
          onChange={e => setBroadcast(e.target.value)}
          rows={4}
          placeholder="Type message to send to all Telegram users..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
        />
        <button
          onClick={handleBroadcast}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition"
        >
          Broadcast
        </button>
        {status && <p className="text-sm text-emerald-400">{status}</p>}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Command Usage Stats</h2>
        <div className="text-sm text-slate-400">No stats available in MVP.</div>
      </div>
    </div>
  );
}
