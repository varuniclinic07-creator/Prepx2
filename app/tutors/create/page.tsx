'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateTutorPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('polity');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/tutors/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, notes, subject }),
    });
    setBusy(false);
    if (res.ok) router.push('/tutors');
    else alert((await res.json()).error || 'Failed');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-8">
      <h1 className="text-2xl font-bold text-slate-100">Create AI Tutor</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required value={name} onChange={e => setName(e.target.value)} placeholder="Tutor Name" className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" rows={2} className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
        <textarea required value={notes} onChange={e => setNotes(e.target.value)} placeholder="Paste your strategy notes, approaches, key insights..." rows={6} className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
        <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-sm text-slate-100">
          {['polity','history','geography','economy','science-technology','environment','international-relations','ethics-aptitude','csat-quantitative','csat-logical','csat-comprehension'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-xl font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 transition">
          {busy ? 'Generating...' : 'Create Tutor'}
        </button>
      </form>
    </div>
  );
}
