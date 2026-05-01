'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { createSession } from '@/lib/agents/hermes';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlassCard } from '@/components/ui/GlassCard';
import { Pill } from '@/components/ui/Pill';

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
  const [saveError, setSaveError] = useState<string | null>(null);
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
    setSaveError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSaveError('Not signed in. Please log in again.');
        setSaving(false);
        return;
      }

      // RLS-silent updates affect 0 rows without raising — verify by reading
      // the row back. Surfaces missing UPDATE policies instead of swallowing.
      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ baseline_score: correct, preferred_language: prefLanguage })
        .eq('id', user.id)
        .select('baseline_score')
        .maybeSingle();

      if (updateError) {
        setSaveError(`Save failed: ${updateError.message}`);
        setSaving(false);
        return;
      }
      if (!updated || updated.baseline_score !== correct) {
        setSaveError('Save did not persist. RLS may be blocking the update — please contact support.');
        setSaving(false);
        return;
      }

      await supabase.from('activity_log').insert({ user_id: user.id, event_type: 'diagnostic_completed', metadata: { score: correct, max: 5, language: prefLanguage } });
      await createSession(supabase, user.id);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Network error during save.');
    }
    setSaving(false);
  };

  return (
    <div className="relative mx-auto max-w-2xl space-y-8 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-[5%] h-[35vh] w-[35vh] rounded-full bg-[var(--color-primary-700)]/20 blur-[120px]" />
        <div className="absolute right-[10%] bottom-[5%] h-[35vh] w-[35vh] rounded-full bg-[var(--color-secondary-600)]/15 blur-[120px]" />
      </div>

      {!started ? (
        <GlassCard glow="primary" padding="lg" className="space-y-6 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Welcome, Aspirant</h1>
          <p className="text-white/60">Study in English or Hindi?</p>
          <div className="flex justify-center gap-3">
            <Button onClick={() => handleStart('en')} variant="primary" size="md">English</Button>
            <Button onClick={() => handleStart('hi')} variant="ghost" size="md">हिंदी</Button>
          </div>
        </GlassCard>
      ) : (
        <>
          <div className="space-y-2 text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">Diagnostic Quiz</h1>
            <p className="text-white/60">5 quick questions to calibrate your starting point</p>
          </div>

          {DIAGNOSTIC_QUESTIONS.map((q, idx) => (
            <Card key={q.id} padding="md">
              <div className="flex items-start gap-3">
                <Pill tone="primary">{String(idx + 1)}</Pill>
                <p className="font-medium text-white/90">{q.question}</p>
              </div>
              <div className="mt-4 space-y-2">
                {q.options.map(opt => {
                  const selected = answers[q.id] === opt;
                  const isCorrect = opt === q.correct_option;
                  const stateClass = submitted
                    ? isCorrect
                      ? 'border-[var(--color-success-500)]/50 bg-[var(--color-success-500)]/10 text-white'
                      : selected
                        ? 'border-[var(--color-error-500)]/50 bg-[var(--color-error-500)]/10 text-white'
                        : 'border-white/5 bg-white/[0.02] text-white/55'
                    : selected
                      ? 'border-[var(--color-primary-400)]/60 bg-[var(--color-primary-500)]/15 text-white'
                      : 'border-white/10 bg-white/[0.02] text-white/75 hover:border-white/20 hover:bg-white/5';
                  return (
                    <button
                      key={opt}
                      onClick={() => toggle(q.id, opt)}
                      disabled={submitted}
                      className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${stateClass}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}

          {!submitted ? (
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < 5}
              variant="primary"
              size="lg"
              block
            >
              Submit Diagnostic
            </Button>
          ) : (
            <GlassCard glow="primary" padding="lg" className="space-y-4 text-center">
              <p className="font-display text-4xl font-bold text-[var(--color-primary-300)]">{score} / 5</p>
              <p className="text-white/75">
                {score >= 4 ? 'Strong foundation! We will focus on advanced concepts.' :
                 score >= 2 ? 'Good start. We will reinforce fundamentals + weak areas.' :
                 'Building from the ground up. We have got you covered.'}
              </p>
              {saveError && (
                <div role="alert" className="rounded-xl border border-[var(--color-error-500)]/30 bg-[var(--color-error-500)]/10 p-3 text-sm text-[var(--color-error-500)]">
                  {saveError}
                </div>
              )}
              <Button
                onClick={() => router.push('/dashboard')}
                disabled={saving || !!saveError}
                variant="primary"
                size="md"
              >
                {saving ? 'Saving…' : saveError ? 'Save failed' : 'Go to Dashboard'}
              </Button>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}
