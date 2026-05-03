// CA Video Newspaper — user-facing player page.
// Sprint 4-2.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import CaVideoPlayer from '../CaVideoPlayer';

export const dynamic = 'force-dynamic';

export default async function CaVideoByDatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Parse date — expect YYYY-MM-DD format.
  const bundleDate = date.match(/^\d{4}-\d{2}-\d{2}$/) ? date : null;
  if (!bundleDate) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-bold mb-4">Invalid date format</h1>
        <p className="text-slate-400">Use YYYY-MM-DD format, e.g. /ca-video/2026-03-15</p>
      </div>
    );
  }

  // Fetch approved video newspaper for this date.
  const { data: video, error } = await supabase
    .from('ca_video_newspapers')
    .select('*')
    .eq('bundle_date', bundleDate)
    .eq('approval_status', 'approved')
    .maybeSingle();

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-400">{error.message}</p>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <h1 className="text-2xl font-bold mb-2">No Video Newspaper Available</h1>
        <p className="text-slate-400">
          No approved video newspaper found for {new Date(bundleDate).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}.
        </p>
        <a href="/current-affairs" className="text-cyan-400 hover:underline text-sm mt-4 inline-block">
          &larr; Back to Current Affairs
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <a href="/current-affairs" className="text-cyan-400 hover:underline text-sm mb-4 inline-block">
          &larr; Back to Current Affairs
        </a>
        <h1 className="text-2xl font-bold mb-1">{video.title}</h1>
        <p className="text-slate-400 mb-2">
          {new Date(video.bundle_date).toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
          {video.theme ? ` — ${video.theme}` : ''}
        </p>
        <p className="text-slate-500 text-sm mb-6">
          Duration: {Math.floor(video.duration_seconds / 60)}m {video.duration_seconds % 60}s
        </p>

        <CaVideoPlayer video={video} />
      </div>
    </div>
  );
}
