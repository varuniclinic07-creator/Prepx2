'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { subscribeToTable, subscribeToAll } from '@/lib/realtime';

interface Q {
  question: string;
  options: string[];
  correct_option: string;
}

interface EventData {
  id: string;
  event_start: string;
  status: 'scheduled' | 'live' | 'completed';
  prize_pool: number;
  question_count: number;
  current_question: number;
  quiz_id?: string;
}

interface Participant {
  user_id: string;
  score: number;
  eliminated_at?: string;
  last_answer_correct?: boolean;
}

export default function BattleRoyalePage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [currentEvent, setCurrentEvent] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [eliminated, setEliminated] = useState(false);
  const [winner, setWinner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const supabase = createClient();

  const fetchEvents = useCallback(async () => {
    const res = await fetch('/api/battle-royale?type=active', { credentials: 'same-origin' });
    const data = await res.json();
    setEvents(data.events || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => {
    const unsub = subscribeToAll(supabase, 'battle_royale_events', (payload) => {
      const newData = payload.new as unknown as EventData;
      if (payload.eventType === 'INSERT') {
        setEvents(prev => [...prev, newData]);
      } else if (payload.eventType === 'UPDATE') {
        setEvents(prev => prev.map(e => e.id === newData.id ? newData : e));
      }
    });
    return unsub;
  }, []);

  // Realtime updates for current event
  useEffect(() => {
    if (!currentEvent?.id) return;
    const unsub = subscribeToTable(supabase, 'battle_royale_events', `id=eq.${currentEvent.id}`, (payload) => {
      const ev = payload.new as unknown as EventData;
      setCurrentEvent(ev);
      if (ev.status === 'completed') {
        checkIfWinner(ev.id);
      }
    });
    return unsub;
  }, [currentEvent?.id]);

  useEffect(() => {
    if (!currentEvent?.id) return;
    const unsub = subscribeToTable(supabase, 'battle_royale_participants', `event_id=eq.${currentEvent.id}`, () => {
      fetch(`/api/battle-royale?type=leaderboard&event_id=${currentEvent.id}`, { credentials: 'same-origin' })
        .then(r => r.json())
        .then(data => setParticipants(data.leaderboard || []));
    });
    return unsub;
  }, [currentEvent?.id]);

  useEffect(() => {
    if (timeLeft <= 0 || !currentEvent || eliminated || currentEvent.status !== 'live') return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, currentEvent, eliminated]);

  useEffect(() => {
    if (timeLeft === 0 && currentEvent && !eliminated) {
      submitOption('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const joinEvent = async (eventId: string) => {
    const res = await fetch('/api/battle-royale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'join', event_id: eventId }),
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Join failed'); return; }
    const statusRes = await fetch(`/api/battle-royale?type=status&event_id=${eventId}`, { credentials: 'same-origin' });
    const statusData = await statusRes.json();
    setCurrentEvent(statusData.event);
    setTimeLeft(15);
    // Load questions dynamically from the event's linked quiz
    if (statusData.event?.quiz_id) {
      const { data: quizData } = await supabase.from('quizzes').select('questions').eq('id', statusData.event.quiz_id).single();
      const loaded = quizData?.questions || [];
      setQuestions(loaded.map((q: any) => ({
        question: q.question || q.text || '',
        options: q.options || [],
        correct_option: q.correct_option || q.answer || ''
      })));
    }
    setCurrentQIndex(0);
    setEliminated(false);
    setWinner(false);
    setFeedback(null);
    setSelectedOption(null);
  };

  const submitOption = async (option: string) => {
    if (!currentEvent || eliminated) return;
    const q = questions[currentQIndex];
    if (!q) return;
    const res = await fetch('/api/battle-royale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'answer', event_id: currentEvent.id, question_id: String(currentQIndex), answer: option, correct_option: q.correct_option }),
      credentials: 'same-origin',
    });
    const data = await res.json();
    if (data.eliminated) {
      setEliminated(true);
      setFeedback('❌ Eliminated!');
      return;
    }
    setFeedback('✅ Correct!');
    setTimeout(() => {
      setFeedback(null);
      setSelectedOption(null);
      setTimeLeft(15);
      setCurrentQIndex(i => i + 1);
    }, 1000);
  };

  const checkIfWinner = async (eventId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await fetch(`/api/battle-royale?type=leaderboard&event_id=${eventId}`, { credentials: 'same-origin' });
    const data = await res.json();
    const board = data.leaderboard || [];
    const top = board[0];
    if (top?.user_id === user.id) {
      setWinner(true);
    }
  };

  const nextQuestion = questions[currentQIndex];

  if (loading) return <div className="text-slate-400 text-center py-12">Loading...</div>;

  if (winner) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <div className="text-6xl">🏆</div>
        <h1 className="text-3xl font-bold text-emerald-400">Winner!</h1>
        <p className="text-slate-300">You survived the Royale and claimed the throne.</p>
        <div className="text-amber-400 font-bold text-lg">+1000 🪙 awarded</div>
      </div>
    );
  }

  if (eliminated) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
        <div className="text-6xl">💀</div>
        <h1 className="text-3xl font-bold text-red-400">Eliminated</h1>
        <p className="text-slate-300">Better luck next time, warrior.</p>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-400 mb-2">Leaderboard</h3>
          {participants.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm text-slate-300 py-1">
              <span>{p.user_id.slice(0, 8)}…</span>
              <span className="font-bold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (currentEvent && currentEvent.status === 'live') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-100">⚔️ Battle Royale</h1>
          <div className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-emerald-400'}`}>{timeLeft}s</div>
        </div>

        {nextQuestion ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="text-sm text-slate-400">Question {currentQIndex + 1} / {questions.length}</div>
            <h2 className="text-lg font-semibold text-slate-100">{nextQuestion.question}</h2>
            <div className="grid grid-cols-1 gap-3">
              {nextQuestion.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setSelectedOption(opt); submitOption(opt); }}
                  disabled={selectedOption !== null}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition text-sm font-medium
                    ${selectedOption === opt ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {feedback && <div className="text-sm font-bold text-center">{feedback}</div>}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">Waiting for questions...</div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-400 mb-2">Live Leaderboard</h3>
          {participants.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm text-slate-300 py-1">
              <span>{p.user_id.slice(0, 8)}… {p.eliminated_at && '💀'}</span>
              <span className="font-bold">{p.score}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">⚔️ Battle Royale</h1>
      </div>

      {events.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">No upcoming battle royale events scheduled.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(ev => {
            const start = new Date(ev.event_start);
            return (
              <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                    ev.status === 'live' ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                    'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  }`}>{ev.status}</span>
                  <span className="text-sm text-amber-400 font-bold">{ev.prize_pool} 🪙</span>
                </div>
                <div className="text-sm text-slate-300">
                  Starts: <span className="font-semibold text-slate-100">{start.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-sm text-slate-400">Questions: {ev.question_count}</div>
                {ev.status === 'scheduled' && (
                  <button
                    onClick={() => joinEvent(ev.id)}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition"
                  >
                    Join Event
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
