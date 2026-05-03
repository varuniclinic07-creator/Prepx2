'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@/lib/supabase-browser';

const SAMPLE_QUESTIONS = [
  "Discuss the significance of the Directive Principles of State Policy in the Indian Constitution. How do they complement Fundamental Rights? (250 words)",
  "Analyze the role of civil society in strengthening democratic governance in India. (250 words)",
  "Evaluate the impact of Green Revolution on Indian agriculture. Discuss its social and environmental implications. (300 words)",
  "What are the challenges in implementing cooperative federalism in India? Suggest measures to strengthen Centre-State relations. (250 words)",
  "Critically examine the role of technology in transforming public service delivery in India. (250 words)",
];

interface DimScores {
  structure: number;
  content: number;
  analysis: number;
  presentation: number;
  overall: number;
}

interface Feedback {
  structure: string;
  content: string;
  analysis: string;
  presentation: string;
}

interface EvalResult {
  attempt_id: string;
  scores: DimScores;
  feedback: Feedback | null;
  summary: string | null;
  next_steps: string[];
  word_count: number;
}

interface HistoryRow {
  id: string;
  attempt_id: string;
  overall_score: number;
  structure_score: number;
  content_score: number;
  analysis_score: number;
  presentation_score: number;
  summary: string | null;
  word_count: number | null;
  created_at: string;
}

const DIMS = ['structure', 'content', 'analysis', 'presentation'] as const;

function scoreColor(s: number) {
  if (s >= 7) return 'text-emerald-400';
  if (s >= 5) return 'text-amber-400';
  return 'text-red-400';
}

function barColor(s: number) {
  if (s >= 7) return 'bg-emerald-500';
  if (s >= 5) return 'bg-amber-500';
  return 'bg-red-500';
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function MainsPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const idx = Math.floor(Math.random() * SAMPLE_QUESTIONS.length);
    setQuestion(SAMPLE_QUESTIONS[idx]);
  }, []);

  useEffect(() => {
    if (timerActive && !submitted) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerActive, submitted]);

  const loadHistory = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('answer_evaluations')
      .select('id, attempt_id, overall_score, structure_score, content_score, analysis_score, presentation_score, summary, word_count, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setHistory(data as HistoryRow[]);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const TARGET_WORDS = 250;

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswer(e.target.value);
    if (!timerActive && e.target.value.length > 0) setTimerActive(true);
  };

  const handleSubmit = async () => {
    if (!answer.trim() || loading) return;
    setLoading(true);
    setSubmitted(true);
    setTimerActive(false);
    setError('');

    try {
      const res = await fetch('/api/mains/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: question.slice(0, 500), answer_text: answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation failed');
      setResult(data as EvalResult);
      await loadHistory();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSubmitted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNewQuestion = () => {
    const current = SAMPLE_QUESTIONS.indexOf(question);
    const next = (current + 1) % SAMPLE_QUESTIONS.length;
    setQuestion(SAMPLE_QUESTIONS[next]);
    setAnswer('');
    setResult(null);
    setSubmitted(false);
    setTimer(0);
    setTimerActive(false);
    setError('');
    setExpandedDim(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <h1 className="text-3xl font-bold tracking-tight">Mains Answer Writing</h1>
          <p className="text-slate-400 text-sm">UPSC CSE GS Practice — AI-powered evaluation with per-dimension feedback</p>
        </motion.div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: Question + Composer (60%) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Question card */}
            <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Question</h2>
                <button
                  onClick={handleNewQuestion}
                  className="shrink-0 text-xs text-slate-400 hover:text-slate-200 border border-white/10 rounded-full px-3 py-1 transition"
                >
                  Next question
                </button>
              </div>
              <p className="text-slate-200 text-sm leading-relaxed">{question}</p>
            </div>

            {/* Composer card */}
            <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4">
              {/* Stats row */}
              <div className="flex items-center justify-between text-xs">
                <span className={words > TARGET_WORDS ? 'text-amber-400' : 'text-slate-400'}>
                  {words} / {TARGET_WORDS} words
                </span>
                <span className="text-slate-400 font-mono">{formatTime(timer)}</span>
              </div>

              {/* Word count progress bar */}
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (words / TARGET_WORDS) * 100)}%` }}
                />
              </div>

              <textarea
                className="w-full h-64 bg-black/30 border border-white/10 rounded-xl p-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none text-sm leading-relaxed transition"
                placeholder="Write your answer here. Timer starts on first keystroke..."
                value={answer}
                onChange={handleAnswerChange}
                disabled={submitted && !error}
              />

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              {!submitted || error ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !answer.trim()}
                  className="w-full py-3 bg-white text-black font-semibold rounded-full hover:bg-slate-200 disabled:bg-white/10 disabled:text-slate-600 transition text-sm"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Evaluating...
                    </span>
                  ) : 'Submit for Evaluation'}
                </button>
              ) : (
                <button
                  onClick={handleNewQuestion}
                  className="w-full py-3 border border-white/10 text-slate-300 font-semibold rounded-full hover:border-white/20 hover:text-white transition text-sm"
                >
                  Practice another question
                </button>
              )}
            </div>
          </motion.div>

          {/* Right: Score panel (40%) */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center gap-4 h-80"
                >
                  <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">AI examiner is reviewing your answer...</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  {/* Overall score */}
                  <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-6 text-center">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Overall Score</p>
                    <p className={`text-6xl font-bold ${scoreColor(result.scores.overall)}`}>
                      {result.scores.overall.toFixed(1)}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">out of 10</p>
                    {result.summary && (
                      <p className="text-slate-300 text-xs mt-4 leading-relaxed">{result.summary}</p>
                    )}
                  </div>

                  {/* Per-dimension bars */}
                  <div className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Dimension Scores</p>
                    {DIMS.map(dim => {
                      const score = result.scores[dim];
                      const fb = result.feedback?.[dim];
                      const isExpanded = expandedDim === dim;
                      return (
                        <div key={dim} className="space-y-1">
                          <button
                            onClick={() => setExpandedDim(isExpanded ? null : dim)}
                            className="w-full flex items-center justify-between group"
                          >
                            <span className="text-sm text-slate-300 capitalize group-hover:text-white transition">{dim}</span>
                            <span className={`text-sm font-bold ${scoreColor(score)}`}>{score}/10</span>
                          </button>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${barColor(score)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${score * 10}%` }}
                              transition={{ duration: 0.8, delay: DIMS.indexOf(dim) * 0.1 }}
                            />
                          </div>
                          <AnimatePresence>
                            {isExpanded && fb && (
                              <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-xs text-slate-400 leading-relaxed pt-1 overflow-hidden"
                              >
                                {fb}
                              </motion.p>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    {result.feedback && (
                      <p className="text-xs text-slate-600 pt-1">Click a dimension to expand feedback</p>
                    )}
                  </div>

                  {/* Next steps */}
                  {result.next_steps.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-6 space-y-3"
                    >
                      <p className="text-xs text-cyan-400 uppercase tracking-wider">Next Steps</p>
                      <ul className="space-y-2">
                        {result.next_steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="shrink-0 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl p-8 flex flex-col items-center justify-center gap-3 h-80 text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-sm">Write your answer and submit to get AI evaluation with per-dimension feedback.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* History: last 5 evaluations */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/[0.03] border border-white/10 backdrop-blur-md rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-sm font-semibold text-slate-200">Recent Evaluations</h2>
            </div>
            <div className="divide-y divide-white/5">
              {history.map(row => (
                <div key={row.id} className="px-6 py-4 flex items-center gap-4">
                  <div className="shrink-0 text-xs text-slate-500 w-24">
                    {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="flex-1 min-w-0">
                    {row.summary && (
                      <p className="text-xs text-slate-400 truncate">{row.summary}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-4 text-xs">
                    {['S', 'C', 'A', 'P'].map((label, i) => {
                      const score = [row.structure_score, row.content_score, row.analysis_score, row.presentation_score][i];
                      return (
                        <span key={label} className="hidden sm:block text-slate-500">
                          {label}: <span className={scoreColor(score)}>{score}</span>
                        </span>
                      );
                    })}
                    <span className={`font-bold text-sm ${scoreColor(row.overall_score)}`}>
                      {row.overall_score.toFixed(1)}/10
                    </span>
                    {row.word_count != null && (
                      <span className="text-slate-600">{row.word_count}w</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
