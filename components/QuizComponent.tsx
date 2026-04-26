'use client';

import { useState } from 'react';
import { supabase, createWeakArea, createQuizAttempt } from '@/lib/supabase';
import { transition } from '@/lib/agents/hermes';
import { awardCoins } from '@/lib/coins';

export function QuizComponent({ quizId, questions }: { quizId: string; questions: any[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const toggle = (qId: string, choice: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: choice }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach((q: any) => {
      if (answers[q.id] === q.correct_option) correct++;
    });
    setScore(correct);
    setSubmitted(true);

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (userId) {
      await createQuizAttempt(userId, quizId, answers, { silly: 0, concept: 0, time: 0 });
      await transition(userId, 'feedback', { quizId });
      for (const q of questions) {
        if (answers[q.id] === q.correct_option) {
          // AC: +5 coins per correct answer
          await awardCoins(userId, 5, 'quiz_correct', `quiz-${quizId}-q-${q.id}`);
        } else {
          await createWeakArea(userId, quizId.split('-')[0] || 'topic-001', 'concept', 3);
        }
      }
      // F1.5: Auto-trigger rank prediction on significant activity
      fetch('/api/rank/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {});
    }
  };

  return (
    <div className="space-y-6">
      {questions.map((q: any, idx: number) => (
        <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">{idx + 1}</span>
            <p className="text-slate-200 text-sm">{q.question}</p>
          </div>
          <div className="mt-3 space-y-2">
            {q.options.map((opt: string) => {
              const selected = answers[q.id] === opt;
              const isCorrect = opt === q.correct_option;
              return (
                <button
                  key={opt}
                  onClick={() => toggle(q.id, opt)}
                  className={`w-full text-left text-sm px-4 py-2 rounded-lg border transition ${
                    submitted
                      ? isCorrect
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : selected
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-slate-700 bg-slate-800'
                      : selected
                      ? 'border-emerald-500 bg-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                  }`}
                  disabled={submitted}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button onClick={handleSubmit} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition">Submit Quiz</button>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
          <p className="text-2xl font-bold text-emerald-400">{score} / {questions.length}</p>
          <p className="text-slate-400 text-sm mt-1">Good effort! Review incorrect answers above.</p>
        </div>
      )}
    </div>
  );
}
