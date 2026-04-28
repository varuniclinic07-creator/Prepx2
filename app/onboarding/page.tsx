'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/agents/hermes';
import { useRouter } from 'next/navigation';

const DIAGNOSTIC_QUESTIONS = [
  { id: 'd1', question: 'Which constitutional article abolished Untouchability?', options: ['Article 14', 'Article 17', 'Article 21', 'Article 32'], correct_option: 'Article 17' },
  { id: 'd2', question: 'The President of India is elected by:', options: ['Direct popular vote', 'Electoral College', 'Lok Sabha only', 'Rajya Sabha only'], correct_option: 'Electoral College' },
  { id: 'd3', question: 'Which Schedule of the Constitution contains the list of subjects under the Union, State, and Concurrent Lists?', options: ['Seventh', 'Eighth', 'Ninth', 'Tenth'], correct_option: 'Seventh' },
  { id: 'd4', question: 'The Doctrine of Basic Structure was established in which case?', options: ['Golaknath', 'Kesavananda Bharati', 'Minerva Mills', 'Indira Gandhi'], correct_option: 'Kesavananda Bharati' },
  { id: 'd5', question: 'Who appoints the Chief Election Commissioner of India?', options: ['Prime Minister', 'President', 'Parliament', 'Supreme Court'], correct_option: 'President' },
];

export default function OnboardingPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const [prefLanguage, setPrefLanguage] = useState<'en' | 'hi'>('en');
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('preferred_language') as 'en' | 'hi' | null;
    if (saved === 'en' || saved === 'hi') setPrefLanguage(saved);
  }, []);

  const toggle = (qId: string, choice: string) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qId]: choice }));
  };

  const handleStart = (lang: 'en' | 'hi') => {
    setPrefLanguage(lang);
    localStorage.setItem('preferred_language', lang);
    setStarted(true);
  };

  const handleSubmit = async () => {
    let correct = 0;
    DIAGNOSTIC_QUESTIONS.forEach(q => {
      if (answers[q.id] === q.correct_option) correct++;
    });
    setScore(correct);
    setSubmitted(true);
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('users').update({ baseline_score: correct, preferred_language: prefLanguage }).eq('id', user.id);
        await supabase.from('activity_log').insert({ user_id: user.id, event_type: 'diagnostic_completed', metadata: { score: correct, max: 5, language: prefLanguage } });
        await createSession(supabase, user.id);
      }
    } catch {
      // pass through for E2E / CI without real Supabase
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-8">
      {!started ? (
        <div className="text-center space-y-6 py-12">
          <h1 className="text-3xl font-bold text-slate-100">Welcome, Aspirant</h1>
          <p className="text-slate-400">Study in English or Hindi?</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => handleStart('en')}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
            >
              English
            </button>
            <button
              onClick={() => handleStart('hi')}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold rounded-xl transition"
            >
              हिंदी
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-slate-100">Diagnostic Quiz</h1>
            <p className="text-slate-400">5 quick questions to calibrate your starting point</p>
          </div>

          {DIAGNOSTIC_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-1 rounded">{idx + 1}</span>
                <p className="text-slate-200 font-medium">{q.question}</p>
              </div>
              <div className="mt-3 space-y-2">
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt;
                  const isCorrect = opt === q.correct_option;
                  return (
                    <button
                      key={opt}
                      onClick={() => toggle(q.id, opt)}
                      disabled={submitted}
                      className={`w-full text-left text-sm px-4 py-2 rounded-lg border transition ${
                        submitted
                          ? isCorrect ? 'border-emerald-500 bg-emerald-500/10' : selected ? 'border-red-500 bg-red-500/10' : 'border-slate-700 bg-slate-800'
                          : selected ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < 5}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl transition"
            >
              Submit Diagnostic
            </button>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-8 text-center space-y-4">
              <p className="text-3xl font-bold text-emerald-400">{score} / 5</p>
              <p className="text-slate-300">
                {score >= 4 ? 'Strong foundation! We will focus on advanced concepts.' :
                 score >= 2 ? 'Good start. We will reinforce fundamentals + weak areas.' :
                 'Building from the ground up. We have got you covered.'}
              </p>
              <button
                onClick={() => router.push('/')}
                disabled={saving}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
              >
                {saving ? 'Saving...' : 'Go to Dashboard'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
