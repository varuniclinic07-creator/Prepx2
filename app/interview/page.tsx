'use client';

import { useState } from 'react';

export default function InterviewPage() {
  const [question] = useState('What are the core principles of ethical governance in public administration?');
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<{ fluency: number; content: number; presence: number; feedback: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!answer.trim() || answer.trim().length < 20) return;
    setLoading(true);
    const res = await fetch('/api/interview/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer }),
    });
    const data = await res.json();
    if (res.ok) setResult(data);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-100">Mock Interview</h1>
        <p className="text-slate-400 mt-1">Practice UPSC interview answers and get AI feedback.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Question</h2>
        <p className="text-slate-200 text-base">{question}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Your Answer</h2>
        <textarea
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm min-h-[160px] focus:outline-none focus:border-emerald-500/50"
          placeholder="Type your answer here (min 20 chars)..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-500">{answer.trim().split(/\s+/).length} words</span>
          <button
            onClick={submit}
            disabled={loading || answer.trim().length < 20}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-sm transition"
          >
            {loading ? 'Evaluating...' : 'Submit'}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Feedback</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <ScoreCard label="Fluency" score={result.fluency} />
            <ScoreCard label="Content" score={result.content} />
            <ScoreCard label="Presence" score={result.presence} />
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 text-center">
      <div className="text-xl font-bold text-emerald-400">{score}</div>
      <div className="text-xs text-slate-500 mt-1">/ 10</div>
      <div className="text-sm text-slate-300 mt-1">{label}</div>
    </div>
  );
}
