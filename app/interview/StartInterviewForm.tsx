'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function StartInterviewForm({ topicFocusOptions }: { topicFocusOptions: string[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(topic ? { topicFocus: topic } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        setError(data?.error || `failed (status ${res.status})`);
        return;
      }
      if (data?.sessionId) {
        router.push(`/interview/${data.sessionId}`);
      } else {
        setError('no session id returned');
      }
    } catch (e: any) {
      setError(e?.message || 'network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Topic focus (optional)
        </label>
        <select
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-sm"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          disabled={submitting}
        >
          <option value="">No specific focus</option>
          {topicFocusOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {error && <p className="text-rose-400 text-sm">{error}</p>}
      <button
        onClick={start}
        disabled={submitting}
        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-sm transition"
      >
        {submitting ? 'Starting…' : 'Start interview'}
      </button>
    </div>
  );
}
