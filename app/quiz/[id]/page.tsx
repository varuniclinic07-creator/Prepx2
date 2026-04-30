import { getQuizByTopic, getTopic } from '@/lib/supabase';
import { QuizComponent } from '@/components/QuizComponent';
import Link from 'next/link';

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quiz, topic] = await Promise.all([
    getQuizByTopic(id),
    getTopic(id),
  ]);

  if (!quiz) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-slate-400">Quiz not available yet for this topic.</p>
        <Link href={`/topic/${id}`} className="text-emerald-400 hover:underline mt-4 inline-block">Back to Topic</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quiz</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{topic?.title || 'Topic Quiz'}</h1>
        </div>
        <Link href={`/topic/${id}`} className="text-sm text-emerald-400 hover:underline">Review Topic</Link>
      </div>
      <QuizComponent quizId={quiz.id} topicId={id} questions={quiz.questions || []} />
    </div>
  );
}
