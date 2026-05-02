'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { parseSceneSpec } from '@/lib/3d/scene-spec';

const SceneSpecRenderer = dynamic(
  () => import('@/components/3d/SceneSpecRenderer').then(m => m.SceneSpecRenderer),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-slate-500 text-sm">Loading 3D scene…</div> },
);

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

const JUDGE_NAME: Record<Judge, string> = {
  chairperson: 'Chairperson',
  expert: 'Subject Expert',
  behavioural: 'Behavioural Psychologist',
};
const JUDGE_ACCENT: Record<Judge, string> = {
  chairperson: 'text-cyan-300',
  expert: 'text-emerald-300',
  behavioural: 'text-fuchsia-300',
};

export function Debrief({
  totalScore,
  turns,
  summary,
  strengths,
  weaknesses,
  sceneSpec,
}: {
  totalScore: number;
  turns: TurnRow[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  sceneSpec: any;
}) {
  const validatedScene = useMemo(() => parseSceneSpec(sceneSpec), [sceneSpec]);

  const turnsByIndex = useMemo(() => {
    const map = new Map<number, TurnRow[]>();
    for (const t of turns) {
      if (!map.has(t.turn_index)) map.set(t.turn_index, []);
      map.get(t.turn_index)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [turns]);

  const maxPossible = turns.filter(t => t.user_answer).length * 10;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">Total score</div>
          <div className="text-4xl font-bold text-emerald-300">{totalScore}<span className="text-xl text-slate-500"> / {maxPossible || 30}</span></div>
        </div>
        <div className="text-xs text-slate-400">Three-judge weighted</div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="aspect-video bg-slate-950">
          {validatedScene ? (
            <SceneSpecRenderer spec={validatedScene} />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Scene spec unavailable for this debrief.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-5">
          <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider mb-3">Strengths</h3>
          {strengths.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-emerald-400">▸</span><span>{s}</span></li>)}
            </ul>
          ) : <p className="text-xs text-slate-500">None recorded.</p>}
        </div>
        <div className="bg-slate-900 border border-rose-500/20 rounded-xl p-5">
          <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider mb-3">Areas to improve</h3>
          {weaknesses.length > 0 ? (
            <ul className="space-y-2 text-sm text-slate-200">
              {weaknesses.map((s, i) => <li key={i} className="flex gap-2"><span className="text-rose-400">▸</span><span>{s}</span></li>)}
            </ul>
          ) : <p className="text-xs text-slate-500">None recorded.</p>}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider mb-2">Summary</h3>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Per-turn breakdown</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {turnsByIndex.map(([idx, rows]) => (
            <div key={idx} className="p-5 space-y-3">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Turn {idx}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rows.map(t => (
                  <div key={t.id} className="space-y-2">
                    <div className={`text-sm font-bold ${JUDGE_ACCENT[t.judge]}`}>{JUDGE_NAME[t.judge]}</div>
                    <div className="text-xs text-slate-300">{t.question}</div>
                    <div className="text-xs text-slate-400 italic whitespace-pre-wrap">{t.user_answer || '(unanswered)'}</div>
                    {t.score !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 bg-slate-800 rounded text-slate-200">{t.score}/10</span>
                      </div>
                    )}
                    {t.feedback && (
                      <p className="text-xs text-slate-500 leading-relaxed border-l-2 border-slate-700 pl-2">{t.feedback}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
