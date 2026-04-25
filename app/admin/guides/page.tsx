'use client';

import { useState } from 'react';
import { prelimsGuide, mainsGuide, interviewGuide } from '@/lib/agents/guide-agents';

const guides = [
  { key: 'prelims', name: 'Prelims Guide', agent: prelimsGuide, dot: 'bg-cyan-500', btn: 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30', border: 'border-cyan-500' },
  { key: 'mains', name: 'Mains Guide', agent: mainsGuide, dot: 'bg-emerald-500', btn: 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30', border: 'border-emerald-500' },
  { key: 'interview', name: 'Interview Guide', agent: interviewGuide, dot: 'bg-amber-500', btn: 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30', border: 'border-amber-500' },
];

export default function AdminGuidesPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, string>>({});

  const handleCoach = async (key: string, agent: any) => {
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const advice = await agent.coach('User has been studying GS2 Polity for 45 minutes, completed 2 quizzes with average score 65%.', 'Reviewing Fundamental Rights chapter.');
      setResults(r => ({ ...r, [key]: advice }));
    } catch (e: any) {
      setResults(r => ({ ...r, [key]: `Error: ${e.message}` }));
    }
    setLoading(l => ({ ...l, [key]: false }));
  };

  const handleResearch = async (key: string, agent: any) => {
    setLoading(l => ({ ...l, [`${key}-research`]: true }));
    try {
      const research = await agent.researchDaily('Polity');
      setResults(r => ({ ...r, [`${key}-research`]: research }));
    } catch (e: any) {
      setResults(r => ({ ...r, [`${key}-research`]: `Error: ${e.message}` }));
    }
    setLoading(l => ({ ...l, [`${key}-research`]: false }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Guide Agents</h1>
      <p className="text-slate-400">Control and inspect the 3 UPSC coaching guide agents.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {guides.map(g => (
          <div key={g.key} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${g.dot}`} />
              <h3 className="font-semibold text-slate-100">{g.name}</h3>
            </div>
            <p className="text-xs text-slate-500">
              {g.key === 'prelims' && 'MCQ elimination, smart guessing, overthinking detection'}
              {g.key === 'mains' && 'Answer structure, examples, ARC/PIB citations'}
              {g.key === 'interview' && 'SAR framework, confidence building, DAF analysis'}
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handleCoach(g.key, g.agent)}
                disabled={loading[g.key]}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition disabled:opacity-50 ${g.btn}`}
              >
                {loading[g.key] ? 'Coaching...' : 'Test Coach'}
              </button>
              <button
                onClick={() => handleResearch(g.key, g.agent)}
                disabled={loading[`${g.key}-research`]}
                className="w-full px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-700 transition disabled:opacity-50"
              >
                {loading[`${g.key}-research`] ? 'Researching...' : 'Daily Research'}
              </button>
            </div>
            {results[g.key] && (
              <div className={`bg-slate-800/50 rounded-lg p-3 text-xs text-slate-300 border-l-2 ${g.border}`}>
                <strong>Coach:</strong> {results[g.key].slice(0, 200)}{results[g.key].length > 200 ? '...' : ''}
              </div>
            )}
            {results[`${g.key}-research`] && (
              <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-300 border-l-2 border-emerald-500">
                <strong>Research:</strong> {results[`${g.key}-research`].slice(0, 200)}{results[`${g.key}-research`].length > 200 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
