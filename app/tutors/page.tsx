'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Tutor { id: string; name: string; description: string; subject: string; price: number; rating: number; subscriber_count: number; persona_prompt: string; approved: boolean; }

export default function TutorsPage() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/tutors/create').then(r => r.json()).then(d => { setTutors((d.tutors || []).filter((t: Tutor) => t.approved)); setLoading(false); }); }, []);

  if (loading) return <div className="text-slate-300 text-center py-12">Loading tutors…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">AI Teacher Marketplace</h1>
        <Link href="/tutors/create" className="text-sm px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-600 transition">Create Tutor</Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tutors.map(t => (
          <div key={t.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2 flex flex-col">
            <h3 className="font-bold text-slate-100">{t.name}</h3>
            <p className="text-xs text-slate-400 line-clamp-2">{t.description}</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-1.5 py-0.5 rounded bg-slate-800">{t.subject}</span>
              <span>⭐ {t.rating.toFixed(1)}</span>
              <span>{t.subscriber_count} subs</span>
            </div>
            <div className="flex items-center justify-between pt-2 mt-auto">
              <span className="text-sm font-bold text-emerald-400">₹{t.price}</span>
              <Link href={`/tutors/${t.id}`} className="text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 transition">Preview</Link>
            </div>
          </div>
        ))}
        {tutors.length === 0 && <div className="text-center text-slate-500 col-span-full py-12">No approved tutors yet</div>}
      </div>
    </div>
  );
}
