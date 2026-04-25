import { getTopic } from '@/lib/supabase';
import { TopicViewer } from '@/components/TopicViewer';
import Link from 'next/link';

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = await getTopic(id);
  if (!topic) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-slate-400">Topic not found</p>
        <Link href="/" className="text-emerald-400 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{topic.subject}</span>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{topic.title}</h1>
        </div>
        <Link
          href={`/quiz/${id}`}
          className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition"
        >
          Take Quiz
        </Link>
      </div>
      <TopicViewer topic={topic} />
    </div>
  );
}
