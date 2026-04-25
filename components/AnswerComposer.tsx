'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createMainsAttempt, getMainsAttempts } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import type { MainsScores } from '@/lib/mains-evaluator';

interface MainsAttempt {
  id: string;
  question_id: string;
  answer_text: string;
  scores: MainsScores;
  word_count: number;
  duration_seconds: number;
  created_at: string;
}

export function AnswerComposer({ topicId, prompt }: { topicId: string; prompt: string }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<MainsScores | null>(null);
  const [timer, setTimer] = useState(0);
  const [active, setActive] = useState(false);
  const [history, setHistory] = useState<MainsAttempt[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxWords = 250;
  const words = answer.trim().split(/\s+/).filter(Boolean).length;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (active && !submitted) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, submitted]);

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = await getMainsAttempts(user.id, 5);
    setHistory(rows.map((r: any) => ({
      id: r.id,
      question_id: r.question_id,
      answer_text: r.answer_text,
      scores: r.scores as MainsScores,
      word_count: r.word_count,
      duration_seconds: r.duration_seconds,
      created_at: r.created_at,
    })));
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    setSubmitted(true);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    try {
      const res = await fetch('/api/mains/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: topicId, answer_text: answer, user_id: userId || 'anon' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      const evaled = data.scores as MainsScores;
      setScores(evaled);

      if (userId) {
        await createMainsAttempt(userId, {
          question_id: topicId,
          answer_text: answer,
          scores: evaled,
          word_count: words,
          duration_seconds: timer,
        });
        await loadHistory();
      }
    } catch (e: any) {
      setScores(null);
      alert(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-100">Answer Writing Practice</h2>
        <p className="text-sm text-slate-400">{prompt}</p>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Words: {words}/{maxWords}</span>
          <span>Timer: {formatTime(timer)}</span>
        </div>
        <textarea
          className="w-full h-48 bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          placeholder="Write your answer here..."
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onFocus={() => setActive(true)}
          onBlur={() => setActive(false)}
          disabled={submitted}
        />
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition"
          >
            Submit for Evaluation
          </button>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400">Evaluating via AI...</span>
              </div>
            ) : scores ? (
              <>
                <p className="text-emerald-400 font-bold text-center">Evaluation Results</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
                  {(['structure', 'content', 'analysis', 'presentation', 'overall'] as const).map(k => (
                    <div key={k} className="bg-slate-800 rounded-lg p-2">
                      <div className="text-slate-400 capitalize">{k}</div>
                      <div className="text-emerald-400 font-bold text-sm">{scores[k]}/10</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-red-400 text-sm text-center">Evaluation failed. Please try again.</p>
            )}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-bold text-slate-100">Recent Attempts</h3>
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-xs bg-slate-800 rounded-lg p-3">
                <div className="text-slate-400">{new Date(h.created_at).toLocaleDateString()}</div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">{h.word_count} words</span>
                  <span className="text-slate-500">{formatTime(h.duration_seconds)}</span>
                  <span className="text-emerald-400 font-bold">{(h.scores?.overall ?? 0)}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
