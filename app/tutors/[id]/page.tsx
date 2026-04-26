'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { aiChat } from '@/lib/ai-router';

interface Message { role: 'system' | 'user' | 'assistant'; content: string; }

export default function TutorChatPage() {
  const { id } = useParams() as { id: string };
  const [tutorName, setTutorName] = useState('');
  const [persona, setPersona] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    fetch('/api/tutors/create').then(r => r.json()).then(d => {
      const t = (d.tutors || []).find((x: any) => x.id === id);
      if (t) { setTutorName(t.name); setPersona(t.persona_prompt); }
      setLoading(false);
    });
  }, [id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setBusy(true);
    const reply = await aiChat({ messages: [{ role: 'system', content: persona || 'You are a helpful tutor.' }, ...newMessages] });
    setBusy(false);
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
  };

  if (loading) return <div className="text-slate-300 text-center py-12">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-140px)] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-100">Chat with {tutorName || 'Tutor'}</h1>
      </div>
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${m.role === 'user' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-200'}`}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="text-xs text-slate-500 animate-pulse">Typing…</div>}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask something…" className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
        <button onClick={send} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 disabled:bg-slate-700 transition">Send</button>
      </div>
    </div>
  );
}
