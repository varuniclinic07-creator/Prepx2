'use client';

import { useState, useEffect } from 'react';

export default function PredictionsPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetch('/api/predictions').then(r => r.json()).then(data => {
      setPredictions(data.predictions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const addToPlan = async (topicId: string) => {
    setAdding(topicId);
    const res = await fetch('/api/daily-plan/add-topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: topicId }),
    });
    if (res.ok) setMessage('Added to today\'s plan ✅');
    else setMessage('Failed to add. Try again.');
    setAdding(null);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Predicted Questions</h1>
        <p className="text-slate-400">Topics most likely to appear this year based on historical + AI analysis.</p>
      </div>
      {message && <div className="text-center text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg py-2">{message}</div>}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-16 animate-pulse" />)}
        </div>
      ) : predictions.length === 0 ? (
        <div className="text-center text-slate-500 py-12">No predictions available yet.</div>
      ) : (
        <div className="space-y-3">
          {predictions.map((p, i) => (
            <div key={p.topic_id || i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-100">{i + 1}. {p.title}</div>
                <div className="text-xs text-slate-500">{p.subject} · {p.reason}</div>
                <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${
                    p.confidence_score > 70 ? 'bg-emerald-500' : p.confidence_score > 40 ? 'bg-cyan-500' : 'bg-amber-500'
                  }`} style={{ width: `${p.confidence_score}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-sm font-bold ${p.confidence_score > 70 ? 'text-emerald-400' : p.confidence_score > 40 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {p.confidence_score}%
                </span>
                <button
                  onClick={() => addToPlan(p.topic_id)}
                  disabled={adding === p.topic_id}
                  className="text-xs px-3 py-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/25 rounded-lg transition disabled:opacity-50"
                >
                  {adding === p.topic_id ? 'Adding...' : 'Add to Plan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
