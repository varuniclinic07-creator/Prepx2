'use client';

import { useState, useEffect } from 'react';

interface Match {
  id: string;
  topic: string;
  status: string;
  initiator_id: string;
  opponent_id: string | null;
  winner_user_id: string | null;
  ai_verdict: any;
  created_at: string;
  completed_at: string | null;
}

interface Submission {
  id: string;
  user_id: string;
  essay_text: string;
  word_count: number;
  scores: any;
  submitted_at: string;
}

export default function EssayColosseumPage() {
  const [view, setView] = useState<'list' | 'create' | 'write' | 'result'>('list');
  const [matches, setMatches] = useState<Match[]>([]);
  const [topic, setTopic] = useState('');
  const [opponentEmail, setOpponentEmail] = useState('');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [essayText, setEssayText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(1800); // 30 min default
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    setLoading(true);
    try {
      const res = await fetch('/api/essay-colosseum/list', { method: 'POST' });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e) { setError('Failed to load matches'); }
    setLoading(false);
  }

  async function createMatch() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/essay-colosseum/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), opponent_email: opponentEmail.trim() || null }),
      });
      const data = await res.json();
      if (data.match) { setActiveMatch(data.match); setView('write'); setTimer(1800); setTimerRunning(true); }
    } catch (e) { setError('Failed to create match'); }
    setLoading(false);
  }

  async function acceptMatch(matchId: string) {
    setLoading(true);
    try {
      await fetch('/api/essay-colosseum/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: matchId }),
      });
      const match = matches.find(m => m.id === matchId);
      if (match) { setActiveMatch(match); setView('write'); setTimer(1800); setTimerRunning(true); }
    } catch (e) { setError('Failed to accept match'); }
    setLoading(false);
  }

  async function submitEssay() {
    if (!activeMatch || !essayText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/essay-colosseum/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: activeMatch.id, essay_text: essayText.trim() }),
      });
      const data = await res.json();
      if (data.submitted) {
        if (data.match_closed) {
          setSubmissions([data.verdict?.player_a, data.verdict?.player_b].filter(Boolean));
          setActiveMatch(prev => prev ? { ...prev, status: 'closed', ai_verdict: data.verdict } : prev);
          setView('result');
        } else {
          setView('list');
          loadMatches();
        }
      }
    } catch (e) { setError('Submit failed'); }
    setLoading(false);
  }

  // Timer
  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setTimer(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">Essay Colosseum</h1>
        <span className="text-xs text-slate-400 uppercase tracking-wider">1v1 Essay Battles</span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* List View */}
      {view === 'list' && (
        <div className="space-y-4">
          <button onClick={() => setView('create')} className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
            ⚔️ Challenge a Friend
          </button>
          <div className="space-y-3">
            {matches.map(m => (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-100">{m.topic}</p>
                  <p className="text-xs text-slate-500">Status: <span className={m.status === 'open' ? 'text-emerald-400' : m.winner_user_id ? 'text-amber-400' : 'text-slate-400'}>{m.status.toUpperCase()}</span></p>
                  {m.ai_verdict?.winner_user_id && (
                    <p className="text-xs text-amber-400 mt-1">🏆 Winner: Player {m.ai_verdict.winner_user_id.slice(0, 8)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {m.status === 'open' && !m.opponent_id && (
                    <button onClick={() => acceptMatch(m.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs transition">Accept</button>
                  )}
                  {m.status === 'open' && (
                    <button onClick={() => { setActiveMatch(m); setView('write'); setTimer(1800); setTimerRunning(true); }} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs transition">Write</button>
                  )}
                  {m.status === 'closed' && (
                    <button onClick={() => { setActiveMatch(m); setView('result'); }} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs transition">Results</button>
                  )}
                </div>
              </div>
            ))}
            {matches.length === 0 && <p className="text-sm text-slate-500">No matches yet. Start a challenge!</p>}
          </div>
        </div>
      )}

      {/* Create View */}
      {view === 'create' && (
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-bold text-slate-100">New Challenge</h2>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Essay topic (e.g., Climate Change & Governance)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            onKeyDown={e => e.key === 'Enter' && createMatch()} />
          <input value={opponentEmail} onChange={e => setOpponentEmail(e.target.value)} placeholder="Opponent email (optional)"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500" />
          <div className="flex gap-3">
            <button onClick={createMatch} disabled={loading} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
              {loading ? 'Creating...' : 'Create Challenge'}
            </button>
            <button onClick={() => setView('list')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-5 py-2 rounded-lg text-sm transition">Cancel</button>
          </div>
        </div>
      )}

      {/* Write View */}
      {view === 'write' && activeMatch && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100">{activeMatch.topic}</h2>
            <div className="text-xl font-mono font-bold text-amber-400">{fmt(timer)}</div>
          </div>
          <textarea value={essayText} onChange={e => setEssayText(e.target.value)} placeholder="Write your essay here..."
            className="w-full h-96 bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{essayText.trim().split(/\s+/).length} words</span>
            <div className="flex gap-3">
              <button onClick={() => setTimerRunning(r => !r)} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded-lg text-sm transition">
                {timerRunning ? '⏸ Pause' : '▶ Resume'}
              </button>
              <button onClick={submitEssay} disabled={loading || !essayText.trim()} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
                {loading ? 'Submitting...' : '📤 Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result View */}
      {view === 'result' && activeMatch && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-100">Battle Results</h2>
          {activeMatch.ai_verdict && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-sm text-amber-400 font-semibold mb-2">🏆 {activeMatch.ai_verdict.reasoning}</p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {/* Player A */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-200">Player A</h3>
                  <p className="text-xs text-slate-500 mt-1">Score: {activeMatch.ai_verdict.player_a?.scores?.overall ?? 'N/A'}</p>
                  <p className="text-xs text-slate-500">Words: {activeMatch.ai_verdict.player_a?.word_count ?? 'N/A'}</p>
                  <div className="mt-2 space-y-1">
                    {['structure', 'content', 'analysis', 'presentation'].map(dim => (
                      <div key={dim} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-slate-400">{dim}</span>
                        <span className="font-mono text-slate-200">{activeMatch.ai_verdict.player_a?.scores?.[dim] ?? '-'}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Player B */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-200">Player B</h3>
                  <p className="text-xs text-slate-500 mt-1">Score: {activeMatch.ai_verdict.player_b?.scores?.overall ?? 'N/A'}</p>
                  <p className="text-xs text-slate-500">Words: {activeMatch.ai_verdict.player_b?.word_count ?? 'N/A'}</p>
                  <div className="mt-2 space-y-1">
                    {['structure', 'content', 'analysis', 'presentation'].map(dim => (
                      <div key={dim} className="flex items-center justify-between text-xs">
                        <span className="capitalize text-slate-400">{dim}</span>
                        <span className="font-mono text-slate-200">{activeMatch.ai_verdict.player_b?.scores?.[dim] ?? '-'}/10</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {activeMatch.winner_user_id && (
                <div className="mt-4 text-center">
                  <span className="bg-amber-500/20 text-amber-400 text-sm font-bold px-4 py-2 rounded-full">🥇 Winner awarded 500 coins</span>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setView('list')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-5 py-2 rounded-lg text-sm transition">Back to Matches</button>
        </div>
      )}
    </div>
  );
}
