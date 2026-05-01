// Public lecture viewer.
// Server-renders title/chapters/script meta; client component handles the
// <video> element, timestamped notes, and Q&A.

import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { getOrRefreshLectureUrl } from '@/lib/video/storage';
import { LecturePlayer } from './LecturePlayer';

export const dynamic = 'force-dynamic';

type Chapter = { title: string; start: number };

export default async function LecturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  const { data: lecture } = await sb
    .from('video_lectures')
    .select('id, title, duration_seconds, chapters, status, captions_url, thumbnail_url, script_id, published_at')
    .eq('id', id)
    .maybeSingle();

  if (!lecture) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-slate-400">Lecture not found</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  if (lecture.status !== 'published') {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-slate-400">This lecture is not yet published.</p>
        <p className="text-sm text-slate-500">Status: <span className="text-amber-400">{lecture.status}</span></p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  const videoUrl = await getOrRefreshLectureUrl(id);
  if (!videoUrl) {
    return (
      <div className="py-20 text-center">
        <p className="text-xl text-rose-400">Video file is missing.</p>
        <p className="text-sm text-slate-500 mt-2">Render artifact not yet uploaded.</p>
      </div>
    );
  }

  const chapters: Chapter[] = Array.isArray(lecture.chapters) ? lecture.chapters as Chapter[] : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">UPSC Lecture</span>
        <h1 className="text-2xl font-bold text-slate-100 mt-1">{lecture.title}</h1>
        {lecture.published_at && (
          <p className="text-xs text-slate-500 mt-1">Published {new Date(lecture.published_at).toLocaleDateString()}</p>
        )}
      </div>

      <LecturePlayer
        lectureId={id}
        videoUrl={videoUrl}
        captionsUrl={lecture.captions_url}
        chapters={chapters}
        durationSeconds={lecture.duration_seconds ?? 0}
        signedIn={!!user}
      />
    </div>
  );
}
