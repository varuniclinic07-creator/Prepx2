import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { getQuizByTopic, getTopic } from '@/lib/supabase';
import { QuizComponent } from '@/components/QuizComponent';
import { Pill } from '@/components/ui/Pill';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quiz, topic] = await Promise.all([
    getQuizByTopic(id),
    getTopic(id),
  ]);

  if (!quiz) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <GlassCard padding="lg" className="text-center">
          <p className="mb-4 text-base text-white/65">Quiz not available yet for this topic.</p>
          <Link href={`/topic/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} /> Back to Topic
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Pill tone="secondary" className="mb-2"><BookOpen size={11} />Quiz</Pill>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {topic?.title || 'Topic Quiz'}
          </h1>
        </div>
        <Link href={`/topic/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} /> Review Topic
          </Button>
        </Link>
      </div>
      <QuizComponent quizId={quiz.id} topicId={id} questions={quiz.questions || []} />
    </div>
  );
}
