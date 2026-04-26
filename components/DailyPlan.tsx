'use client';

import { useState, useEffect } from 'react';
import { createDailyPlan, updatePlanStatus, supabase } from '@/lib/supabase';
import { transition } from '@/lib/agents/hermes';
import { awardCoins } from '@/lib/coins';
import { QuizTask } from '../types';
import { subscribeToTable } from '@/lib/realtime';

interface DailyPlanProps {
  userId: string;
  initialPlan: { id: string; tasks: QuizTask[]; status: string } | null;
}

const DEFAULT_TASKS: QuizTask[] = [
  { topic_id: 'topic-001', type: 'read', duration: 20, status: 'pending' },
  { topic_id: 'topic-001', type: 'quiz', duration: 10, status: 'pending' },
  { topic_id: 'topic-001', type: 'review', duration: 15, status: 'pending' },
];

export function DailyPlan({ userId, initialPlan }: DailyPlanProps) {
  const [tasks, setTasks] = useState<QuizTask[]>(initialPlan?.tasks || DEFAULT_TASKS);
  const [planId, setPlanId] = useState<string | null>(initialPlan?.id || null);
  const [activeTask, setActiveTask] = useState<number | null>(null);

  useEffect(() => {
    async function loadPlan() {
      if (!initialPlan) {
        const p = await createDailyPlan(userId, DEFAULT_TASKS);
        if (p) {
          setTasks(p.tasks);
          setPlanId(p.id);
        }
      }
    }
    loadPlan();
    let isMounted = true;
    const unsubscribe = subscribeToTable(supabase, 'daily_plans', `user_id=eq.${userId}`, (payload: any) => {
      if (!isMounted) return;
      if (payload.eventType === 'UPDATE' && payload.new?.user_id === userId) {
        setTasks(payload.new.tasks);
        setPlanId(payload.new.id);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [initialPlan, userId]);

  const toggleTask = async (index: number) => {
    const updated = [...tasks];
    updated[index].status = updated[index].status === 'completed' ? 'pending' : 'completed';
    const allDone = updated.every(t => t.status === 'completed');
    setTasks(updated);
    if (planId) {
      await updatePlanStatus(planId, allDone ? 'completed' : 'in_progress');
      if (allDone) {
        await transition(userId, 'done', { dailyPlanId: planId });
        await awardCoins(userId, 50, 'daily_plan_complete', `plan-${planId}`);
        fetch('/api/rank/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }),
        }).catch(() => {});
      }
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Today&apos;s Plan</h2>
        <span className="text-sm text-emerald-400 font-medium">{completedCount}/{tasks.length} completed</span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-6">
        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => (
          <div
            key={index}
            onClick={() => setActiveTask(activeTask === index ? null : index)}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer ${
              task.status === 'completed'
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : activeTask === index
                ? 'bg-slate-800/80 border-cyan-500/30'
                : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleTask(index); }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                task.status === 'completed'
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-600 hover:border-emerald-400'
              }`}
            >
              {task.status === 'completed' && (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            <div className="flex-1">
              <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                {task.type === 'read' && '📖 Read Topic'}
                {task.type === 'quiz' && '🧠 Take Quiz'}
                {task.type === 'review' && '🔄 Review Weak Areas'}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  task.type === 'read' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' :
                  task.type === 'quiz' ? 'bg-violet-500/15 text-violet-400 border border-violet-500/20' :
                  'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                }`}>
                  {task.type === 'read' ? 'New' : task.type === 'quiz' ? 'Practice' : 'Review'}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{task.duration} min</div>
            </div>

            <div className={`text-xs px-2 py-1 rounded-full ${
              task.status === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {task.status === 'completed' ? 'Done' : 'Pending'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
