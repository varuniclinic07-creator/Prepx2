// Sprint 9-D Phase D — interactive learning surface.
//
// Server component. Loads the lecture_jobs row directly (RLS scopes to owner),
// mints a fresh video signed URL, and hands the client a minimal payload:
//   - lectureJobId (for /api/lectures/[id]/query calls)
//   - title + duration (display)
//   - signed video URL
// The concept_index, notes, quiz JSONs are NEVER shipped to the browser —
// the AskExplanation panel queries the server-side semantic engine.

import Link from 'next/link';
import { createClient } from '@/lib/supabase-server';
import { mintLectureSignedUrl } from '@/lib/lecture/storage';
import { LearnView } from './LearnView';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LectureLearnPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-rose-400">Invalid lecture id.</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-slate-400">Please sign in to view this lecture.</p>
        <Link href="/login" className="text-emerald-400 hover:underline">Sign in</Link>
      </div>
    );
  }

  const { data: job } = await sb
    .from('lecture_jobs')
    .select('id, status, topic, storage_prefix, metadata')
    .eq('id', id)
    .maybeSingle();

  if (!job) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-slate-400">Lecture not found.</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  if (job.status !== 'completed') {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-slate-400">This lecture is still being prepared.</p>
        <p className="text-sm text-slate-500">Status: <span className="text-amber-400">{job.status}</span></p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const meta = (job.metadata as any) || {};
  const conceptIndex = meta.concept_index;
  if (!conceptIndex || !Array.isArray(conceptIndex.concepts)) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-rose-400">This lecture is missing its semantic index.</p>
        <p className="text-sm text-slate-500">Re-bake required to enable interactive learning.</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  // Mint a fresh 24h signed URL for the video. Falls back to ffmpeg path if
  // the Remotion artifact isn't present (back-compat with pre-9-C jobs).
  let videoUrl: string | null = null;
  if (job.storage_prefix) {
    try {
      const r = await mintLectureSignedUrl(`${job.storage_prefix}/lecture.mp4`);
      videoUrl = r.url;
    } catch {
      // try Remotion fallback
      try {
        const r = await mintLectureSignedUrl(`${job.storage_prefix}/lecture-remotion.mp4`);
        videoUrl = r.url;
      } catch { /* render artifact missing */ }
    }
  }

  if (!videoUrl) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xl text-rose-400">Video artifact missing.</p>
        <p className="text-sm text-slate-500">The MP4 has not been uploaded yet.</p>
        <Link href="/dashboard" className="text-emerald-400 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <LearnView
      lectureJobId={job.id}
      title={conceptIndex.topic?.title ?? job.topic}
      durationSec={conceptIndex.duration ?? 0}
      videoUrl={videoUrl}
    />
  );
}
