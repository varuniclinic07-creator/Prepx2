// 3D Syllabus Navigator — user-facing page.
// Sprint 4-3.

'use client';

import { useState, useEffect, useCallback } from 'react';
import SyllabusNavigator3D from '@/components/3d/SyllabusNavigator3D';

interface SubjectProgress {
  subject: string;
  totalTopics: number;
  masteredTopics: number;
  avgMastery: number;
  quizzesAttempted: number;
}

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState<SubjectProgress[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    const res = await fetch('/api/syllabus/progress');
    if (res.ok) {
      const data = await res.json();
      setSubjects(data.subjects || []);
      setTopics(data.topics || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const overallPct = subjects.length > 0
    ? Math.round(subjects.reduce((a, s) => a + s.avgMastery, 0) / subjects.length * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Syllabus Navigator</h1>
            <p className="text-slate-400 text-sm mt-1">
              3D visual map of your UPSC preparation progress across all subjects.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400">{overallPct}%</div>
            <div className="text-xs text-slate-500">Overall Mastery</div>
          </div>
        </div>

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl h-[500px] animate-pulse flex items-center justify-center">
            <p className="text-slate-500">Loading progress data...</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl" style={{ height: 500 }}>
            <SyllabusNavigator3D
              subjects={subjects.map((s: any) => ({
                ...s,
                label: s.subject,
              }))}
              topics={topics}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Subject breakdown */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {subjects.map((s) => (
            <div
              key={s.subject}
              className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center"
            >
              <div className="text-xs text-slate-400 truncate">{s.subject.replace(/-/g, ' ')}</div>
              <div className="text-lg font-bold text-cyan-400 mt-1">{Math.round(s.avgMastery * 100)}%</div>
              <div className="text-xs text-slate-500">{s.masteredTopics}/{s.totalTopics} topics</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
