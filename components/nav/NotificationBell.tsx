'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { subscribeToAll } from '@/lib/realtime';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let unsub: (() => void) | undefined;
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (!uid || !mounted) return;
      setUserId(uid);
      supabase.from('user_notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20).then(({ data: rows }) => {
        if (mounted) setNotifications(rows || []);
      });
      supabase.from('user_notifications').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false).then(({ count }) => {
        if (mounted) setCount(count || 0);
      });
      unsub = subscribeToAll(supabase, 'user_notifications', (payload) => {
        if (!mounted) return;
        if (payload.eventType === 'INSERT') {
          const n = payload.new;
          if (n.user_id !== uid) return;
          setNotifications(prev => [n, ...prev].slice(0, 20));
          if (!n.read) setCount(c => c + 1);
        }
        if (payload.eventType === 'UPDATE') {
          const n = payload.new;
          setNotifications(prev => prev.map(x => x.id === n.id ? n : x));
          if (n.read) setCount(c => Math.max(0, c - 1));
        }
      });
    });
    return () => { mounted = false; if (unsub) unsub(); };
  }, []);

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('user_notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setCount(c => Math.max(0, c - 1));
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-sm text-amber-400 hover:text-amber-300 transition">
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full font-bold">{count}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-lg z-50 p-3 space-y-2 max-h-96 overflow-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No notifications</p>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => { if (!n.read) markRead(n.id); }} className={`p-3 rounded-lg cursor-pointer transition ${n.read ? 'bg-slate-800/50 opacity-70' : 'bg-slate-800'}`}>
                <div className="text-xs font-bold text-slate-200">{n.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{n.message}</div>
                <div className="text-[10px] text-slate-500 mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
