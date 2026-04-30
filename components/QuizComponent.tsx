'use client';

import { useState } from 'react';
import { createWeakArea, createQuizAttempt } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-browser';

export function QuizComponent({ quizId, topicId, questions }: { quizId: string; topicId: string; questions: any[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const toggle = (qId: string, choice: string) => {
    if (submitted || isSubmitting) return;
    setAnswers(prev => ({ ...prev, [qId]: choice }));
  };

  const handleSubmit = async () => {
    if (submitted || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    let correct = 0;
    questions.forEach((q: any) => {
      if (answers[q.id] === q.correct_option) correct++;
    });

    try {
      const userId = (await createClient().auth.getUser()).data.user?.id;
      if (!userId) {
        setSubmitError('You must be signed in to submit. Please log in and try again.');
        setIsSubmitting(false);
        return;
      }

      // Create attempt FIRST so coin award can be keyed to the attempt id (prevents double-award).
      const attemptId = await createQuizAttempt(userId, quizId, answers, { silly: 0, concept: 0, time: 0 });

      // Idempotency key per CLAUDE.md guidance: attempt-id-scoped so a refresh during submit
      // can't double-award. Falls back to (quiz, user) if attempt insert silently failed.
      const idempotencyKey = attemptId
        ? `quiz_attempt_${attemptId}_completion`
        : `quiz_${quizId}_${userId}_completion`;

      if (correct > 0) {
        await fetch('/api/coins/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: correct * 5, reason: 'quiz_correct', idempotency_key: idempotencyKey }),
        }).catch(() => {});
      }

      // Batch weak-area writes (was a serial N+1 loop). Use the actual topicId from the route,
      // not quizId.split('-')[0] which produced garbage UUID fragments.
      const wrong = questions.filter((q: any) => answers[q.id] !== q.correct_option);
      if (wrong.length > 0) {
        await Promise.all(wrong.map(() => createWeakArea(userId, topicId, 'concept', 3)));
      }

      // F1.5: Auto-trigger rank prediction on significant activity
      fetch('/api/rank/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }).catch(() => {});

      setScore(correct);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Submission failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
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
                  disabled={submitted || isSubmitting}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {submitError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300">
          {submitError}
        </div>
      )}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl transition"
        >
          {isSubmitting ? 'Submitting…' : 'Submit Quiz'}
        </button>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
          <p className="text-2xl font-bold text-emerald-400">{score} / {questions.length}</p>
          <p className="text-slate-400 text-sm mt-1">Good effort! Review incorrect answers above.</p>
        </div>
      )}
    </div>
  );
}
