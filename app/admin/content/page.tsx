'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ALL_SUBJECTS } from '@/lib/agents/subjects';
import { generateTopicContent } from '@/lib/content-agent';

function ContentPageInner() {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('subject') || 'polity';
  const [subject, setSubject] = useState(preselected);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [topicCount, setTopicCount] = useState(0);
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => { setSubject(preselected); loadCount(preselected); loadTopics(); }, [preselected]);

  const loadCount = async (subj: string) => {
    const { count } = await supabase.from('topics').select('id', { count: 'exact' }).eq('subject', subj);
    setTopicCount(count ?? 0);
  };

  const loadTopics = async () => {
    const { data } = await supabase.from('topics').select('id, title, subject, created_at').order('created_at', { ascending: false }).limit(200);
    setTopics(data || []);
  };

  const deleteTopic = async (id: string) => {
    if (!confirm('Delete this topic?')) return;
    const res = await fetch(`/api/admin/topics/${id}`, { method: 'DELETE' });
    if (res.ok) { loadTopics(); loadCount(subject); setResult('Deleted ✅'); }
    else setResult('Delete failed ❌');
  };

  const runAgent = async () => {
    setLoading(true); setResult(`Generating content for ${subject}...`);
    try {
      const subj = ALL_SUBJECTS.find(s => s.id === subject);
      if (!subj) throw new Error('Unknown subject');
      const nextNum = topicCount + 1;
      const tag = `${subj.syllabusPrefix}-L${String(nextNum).padStart(2, '0')}`;
      const title = `${subj.displayName} Topic ${nextNum}`;
      const content = await generateTopicContent(tag, title);
      const { error } = await supabase.from('topics').insert({ title, subject, syllabus_tag: tag, content, readability_score: 70,  });
      if (error) throw error;
      setTopicCount(c => c + 1);
      setResult(`Seeded 1 topic for ${subject} (${tag}). Total: ${topicCount + 1}`);
      loadTopics();
    } catch (e: any) { setResult(`Error: ${e.message}`); }
    setLoading(false);
  };

  const runBatch = async () => {
    setLoading(true); setResult(`Batch generating for ${subject}...`);
    try {
      const subj = ALL_SUBJECTS.find(s => s.id === subject);
      if (!subj) throw new Error('Unknown subject');
      let seeded = 0;
      const startNum = topicCount + 1;
      for (let i = 0; i < 3; i++) {
        const tag = `${subj.syllabusPrefix}-L${String(startNum + i).padStart(2, '0')}`;
        const title = `${subj.displayName} Topic ${startNum + i}`;
        const content = await generateTopicContent(tag, title);
        const { error } = await supabase.from('topics').insert({ title, subject, syllabus_tag: tag, content, readability_score: 70,  });
        if (!error) seeded++;
      }
      setTopicCount(c => c + seeded);
      setResult(`Batch complete: ${seeded} topics seeded. Total: ${topicCount + seeded}`);
      loadTopics();
    } catch (e: any) { setResult(`Error: ${e.message}`); }
    setLoading(false);
  };

  const subjInfo = ALL_SUBJECTS.find(s => s.id === subject);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Content Agent</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <label className="text-sm text-slate-400">Subject</label>
        <select value={subject} onChange={e => { setSubject(e.target.value); loadCount(e.target.value); }} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500">
          {ALL_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.displayName}</option>)}
        </select>
        <div className="flex items-center justify-between text-sm"> <span className="text-slate-400">Current topics: <strong className="text-slate-200">{topicCount}</strong></span> <span className="text-slate-400">Target: <strong className="text-slate-200">{subjInfo?.totalTopics ?? 0}</strong></span> </div>
        <div className="w-full bg-slate-800 rounded-full h-2"><div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (topicCount / Math.max(1, subjInfo?.totalTopics ?? 1)) * 100)}%` }} /></div>
        <div className="flex gap-3">
          <button onClick={runAgent} disabled={loading} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition">{loading ? 'Generating...' : 'Generate 1 Topic'}</button>
          <button onClick={runBatch} disabled={loading} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition">{loading ? 'Running...' : 'Generate 3 Topics'}</button>
        </div>
      </div>
      {result && <div className="text-sm text-slate-300">{result}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-800">
            {topics.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-200">{t.title}</td>
                <td className="px-4 py-3 text-slate-400">{t.subject}</td>
                <td className="px-4 py-3"><button onClick={() => deleteTopic(t.id)} className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">Delete</button></td>
              </tr>
            ))}
            {topics.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No topics</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminContentPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <ContentPageInner />
    </Suspense>
  );
}
