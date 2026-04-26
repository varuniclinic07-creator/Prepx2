'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateAndSaveQuiz, generateQuizzesForSubject } from '@/lib/quiz-generator';
import { ALL_SUBJECTS } from '@/lib/agents/subjects';

function QuizzesPageInner() {
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [topicId, setTopicId] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSingle = async () => {
    if (!topicId.trim()) { setResult('Enter a topic ID'); return; }
    setLoading(true);
    setResult('Generating quiz...');
    const res = await generateAndSaveQuiz(topicId.trim());
    setLoading(false);
    setResult(res.success ? `Quiz created: ${res.quizId}` : `Error: ${res.error}`);
  };

  const handleSubjectBatch = async () => {
    if (!subject) { setResult('Select a subject'); return; }
    setLoading(true);
    setResult(`Generating quizzes for ${subject}...`);
    const res = await generateQuizzesForSubject(subject);
    setLoading(false);
    setResult(`Generated ${res.generated}, Failed ${res.failed}. ${res.errors.length > 0 ? '\n' + res.errors.join('\n') : ''}`);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Quiz Generator</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <label className="text-sm text-slate-400">Filter by Subject</label>
        <select
          value={subject}
          onChange={e => setSubject(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500"
        >
          <option value="">All Subjects</option>
          {ALL_SUBJECTS.map(s => (
            <option key={s.id} value={s.id}>{s.displayName}</option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            onClick={handleSubjectBatch}
            disabled={loading || !subject}
            className="px-5 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition"
          >
            {loading ? 'Running...' : `Generate for ${subject || 'Subject'}`}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Single Topic Quiz</h2>
        <input
          type="text"
          placeholder="topic-001"
          value={topicId}
          onChange={e => setTopicId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button onClick={handleSingle} disabled={loading} className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition">
          {loading ? 'Generating...' : 'Generate Single Quiz'}
        </button>
      </div>

      {result && <pre className="text-xs text-slate-300 whitespace-pre-wrap bg-slate-900 border border-slate-800 rounded-xl p-4">{result}</pre>}
    </div>
  );
}

export default function AdminQuizzesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-400">Loading...</div>}>
      <QuizzesPageInner />
    </Suspense>
  );
}
