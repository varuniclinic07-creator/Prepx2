'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Judge = 'chairperson' | 'expert' | 'behavioural';

interface TurnRow {
  id: string;
  turn_index: number;
  judge: Judge;
  question: string;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
}

const JUDGE_META: Record<Judge, { name: string; persona: string; accent: string; emoji: string }> = {
  chairperson: { name: 'Chairperson',           persona: 'Calm, broad, probes worldview & poise.',  accent: 'cyan',    emoji: '◐' },
  expert:      { name: 'Subject Expert',         persona: 'Technical depth on your topic focus.',     accent: 'emerald', emoji: '◑' },
  behavioural: { name: 'Behavioural Psychologist', persona: 'Ethics, integrity, decision-making.',     accent: 'fuchsia', emoji: '◒' },
};

const ACCENT_CLASSES: Record<string, { border: string; head: string; tag: string }> = {
  cyan:    { border: 'border-cyan-500/30',    head: 'text-cyan-300',    tag: 'bg-cyan-500/10' },
  emerald: { border: 'border-emerald-500/30', head: 'text-emerald-300', tag: 'bg-emerald-500/10' },
  fuchsia: { border: 'border-fuchsia-500/30', head: 'text-fuchsia-300', tag: 'bg-fuchsia-500/10' },
};

export function Panel({ sessionId, turns }: { sessionId: string; turns: TurnRow[] }) {
  const router = useRouter();

  const turnsByIndex = useMemo(() => {
    const map = new Map<number, TurnRow[]>();
    for (const t of turns) {
      if (!map.has(t.turn_index)) map.set(t.turn_index, []);
      map.get(t.turn_index)!.push(t);
    }
    return map;
  }, [turns]);

  const orderedIndices = Array.from(turnsByIndex.keys()).sort((a, b) => a - b);
  const lastIndex = orderedIndices[orderedIndices.length - 1];
  const lastTurn = lastIndex !== undefined ? turnsByIndex.get(lastIndex)! : [];

  const allAnsweredInLastTurn = lastTurn.length === 3 && lastTurn.every(t => !!t.user_answer);
  const lastTurnHasUnansweredQuestions = lastTurn.length === 3 && lastTurn.some(t => !t.user_answer);

  // Local state for answer drafts.
  const [drafts, setDrafts] = useState<Record<Judge, string>>({
    chairperson: lastTurn.find(t => t.judge === 'chairperson')?.user_answer ?? '',
    expert:      lastTurn.find(t => t.judge === 'expert')?.user_answer ?? '',
    behavioural: lastTurn.find(t => t.judge === 'behavioural')?.user_answer ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for new questions when last turn is fully answered (waiting for next round).
  useEffect(() => {
    if (!allAnsweredInLastTurn) return;
    const handle = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(handle);
  }, [allAnsweredInLastTurn, router]);

  // Poll if no questions yet (newly created session waiting for first round).
  useEffect(() => {
    if (lastTurn.length > 0) return;
    const handle = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(handle);
  }, [lastTurn.length, router]);

  async function submitAnswers() {
    if (!lastTurn.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const answers = (['chairperson', 'expert', 'behavioural'] as Judge[])
        .map(j => ({ judge: j, text: drafts[j].trim() }))
        .filter(a => a.text.length > 0);
      if (answers.length === 0) {
        setError('Type at least one answer before submitting.');
        setSubmitting(false);
        return;
      }
      const res = await fetch(`/api/interview/${sessionId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnIndex: lastIndex, answers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        setError(data?.error || `failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function endInterview() {
    if (!confirm('End the interview now and generate the debrief?')) return;
    setEndingInterview(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${sessionId}/end`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 202) {
        setError(data?.error || `failed (${res.status})`);
        setEndingInterview(false);
        return;
      }
      router.refresh();
    } catch (e: any) {
      setError(e?.message || 'network error');
    } finally {
      setEndingInterview(false);
    }
  }

  if (lastTurn.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
        <p className="text-slate-300">The judges are preparing their first round of questions…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Turn {lastIndex} {allAnsweredInLastTurn ? '· awaiting next round' : ''}
        </h2>
        <button
          onClick={endInterview}
          disabled={endingInterview}
          className="px-3 py-1.5 text-xs bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-lg disabled:opacity-50"
        >
          {endingInterview ? 'Ending…' : 'End interview & debrief'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['chairperson', 'expert', 'behavioural'] as Judge[]).map(judge => {
          const t = lastTurn.find(x => x.judge === judge);
          const meta = JUDGE_META[judge];
          const cls = ACCENT_CLASSES[meta.accent];
          if (!t) {
            return (
              <div key={judge} className={`bg-slate-900 border ${cls.border} rounded-xl p-4 space-y-2`}>
                <div className={`text-sm font-bold ${cls.head}`}>{meta.emoji} {meta.name}</div>
                <p className="text-xs text-slate-500">Pending…</p>
              </div>
            );
          }
          return (
            <div key={judge} className={`bg-slate-900 border ${cls.border} rounded-xl p-4 space-y-3 flex flex-col`}>
              <div>
                <div className={`text-sm font-bold ${cls.head}`}>{meta.emoji} {meta.name}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{meta.persona}</div>
              </div>
              <div className={`p-3 rounded-lg ${cls.tag} text-sm text-slate-100 leading-relaxed`}>
                {t.question}
              </div>
              {t.user_answer ? (
                <div className="space-y-1 mt-auto">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Your answer</div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{t.user_answer}</p>
                </div>
              ) : (
                <textarea
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-sm min-h-[140px] focus:outline-none focus:border-emerald-500/50 mt-auto"
                  placeholder="Type your answer…"
                  value={drafts[judge]}
                  onChange={e => setDrafts(d => ({ ...d, [judge]: e.target.value }))}
                  disabled={submitting}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {lastTurnHasUnansweredQuestions && (
        <div className="flex items-center justify-end">
          <button
            onClick={submitAnswers}
            disabled={submitting}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-sm transition"
          >
            {submitting ? 'Submitting…' : 'Submit answers · next round'}
          </button>
        </div>
      )}

      {orderedIndices.length > 1 && (
        <details className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <summary className="cursor-pointer text-sm text-slate-400">Earlier rounds ({orderedIndices.length - 1})</summary>
          <div className="mt-3 space-y-3">
            {orderedIndices.slice(0, -1).map(idx => (
              <div key={idx} className="border-t border-slate-800 pt-3">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Turn {idx}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(turnsByIndex.get(idx) || []).map(t => (
                    <div key={t.id} className="text-xs space-y-1">
                      <div className={`font-bold ${ACCENT_CLASSES[JUDGE_META[t.judge].accent].head}`}>{JUDGE_META[t.judge].name}</div>
                      <div className="text-slate-300">{t.question}</div>
                      <div className="text-slate-400 italic whitespace-pre-wrap">{t.user_answer || '(unanswered)'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
