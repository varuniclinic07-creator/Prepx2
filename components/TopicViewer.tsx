'use client';

import { useState, useEffect } from 'react';
import { transition } from '@/lib/agents/hermes';
import { createClient } from '@/lib/supabase-browser';

type Lang = 'en' | 'hi';

export function TopicViewer({ topic }: { topic: { id: string; title: string; content: any; content_hi?: any } }) {
  const [lang, setLang] = useState<Lang>('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('preferred_language') as Lang | null) : null;
    if (saved === 'en' || saved === 'hi') {
      setLang(saved);
      return;
    }
    // Default from accept-language header via server hint if no localStorage
    const headerLang = (document.documentElement.lang as Lang) || 'en';
    setLang(headerLang === 'hi' ? 'hi' : 'en');
  }, []);

  useEffect(() => {
    async function markStudying() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await transition(supabase, user.id, 'studying', { topicId: topic.id });
      }
    }
    markStudying();
  }, [topic.id]);

  const toggleLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem('preferred_language', next);
  };

  const t = lang === 'hi' && topic.content_hi ? topic.content_hi : topic.content;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-slate-100">{topic.title}</h2>
        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => toggleLang('en')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${lang === 'en' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
            aria-label="Switch to English"
          >
            EN
          </button>
          <button
            onClick={() => toggleLang('hi')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${lang === 'hi' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
            aria-label="Switch to Hindi"
          >
            HI
          </button>
        </div>
      </div>
      {t?.definitions?.map((d: string, i: number) => (
        <div key={i} className="bg-slate-800/50 rounded-lg p-3 border-l-4 border-emerald-500">
          <p className="text-sm text-slate-300">{d}</p>
        </div>
      ))}
      <div className="space-y-3">
        {t?.key_concepts?.map((c: any, i: number) => (
          <div key={i}>
            <h3 className="text-sm font-semibold text-emerald-400">{c.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{c.body}</p>
          </div>
        ))}
      </div>
      {t?.common_traps?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-400">Common Traps</h4>
          <ul className="mt-2 space-y-1">
            {t.common_traps.map((trap: string, i: number) => (
              <li key={i} className="text-xs text-red-300">⚠️ {trap}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-emerald-400">Summary</h4>
        <p className="text-xs text-emerald-300 mt-1">{t?.summary}</p>
      </div>
    </div>
  );
}
