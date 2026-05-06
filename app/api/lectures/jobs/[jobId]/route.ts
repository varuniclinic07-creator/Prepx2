import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { mintLectureSignedUrl } from '@/lib/lecture/storage';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

const JOB_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { jobId } = await ctx.params;
  if (!JOB_ID_RE.test(jobId)) {
    return NextResponse.json({ error: 'Invalid jobId' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // RLS limits SELECT to the owner; admins bypass via the second policy.
  const { data: job, error } = await supabase
    .from('lecture_jobs')
    .select('id, user_id, topic, status, progress_percent, lecture_id, storage_prefix, manifest, metadata, stage_log, error_text, created_at, updated_at, completed_at')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    // 404 (no row OR RLS-blocked — treat the same to avoid leaking ownership).
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // For completed jobs, refresh the signed URLs if the manifest was minted
  // more than 23h ago (signed URLs expire at 24h).
  let manifest = job.manifest as any;
  if (job.status === 'completed' && manifest?.signedUrls && job.storage_prefix) {
    const expiresAt = manifest.expiresAt ? new Date(manifest.expiresAt).getTime() : 0;
    const stale = !expiresAt || expiresAt - Date.now() < 60 * 60 * 1000; // <1h headroom
    if (stale) {
      const refreshed: Record<string, string> = {};
      const candidates = ['lecture.mp4', 'notes.json', 'notes.pdf', 'quiz.json', 'timeline.json', 'metadata.json', 'manifest.json', 'narration.mp3', 'subtitles.srt'];
      for (const name of candidates) {
        try {
          const { url } = await mintLectureSignedUrl(`${job.storage_prefix}/${name}`);
          refreshed[name] = url;
        } catch {
          // skip absent
        }
      }
      manifest = {
        ...manifest,
        signedUrls: {
          video:        refreshed['lecture.mp4']  ?? manifest.signedUrls.video,
          notesJson:    refreshed['notes.json']   ?? manifest.signedUrls.notesJson,
          notesPdf:     refreshed['notes.pdf']    ?? manifest.signedUrls.notesPdf,
          quiz:         refreshed['quiz.json']    ?? manifest.signedUrls.quiz,
          timeline:     refreshed['timeline.json']?? manifest.signedUrls.timeline,
          metadata:     refreshed['metadata.json']?? manifest.signedUrls.metadata,
          manifest:     refreshed['manifest.json']?? manifest.signedUrls.manifest,
          ...(refreshed['narration.mp3'] ? { narrationMp3: refreshed['narration.mp3'] } : {}),
          ...(refreshed['subtitles.srt'] ? { subtitles:   refreshed['subtitles.srt'] } : {}),
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      // Persist the refresh via admin client (RLS would block UPDATE for owners
      // — bucket-write is service-only). Best-effort.
      try {
        const admin = getAdminClient();
        await admin.from('lecture_jobs').update({ manifest }).eq('id', jobId);
      } catch { /* best-effort */ }
    }
  }

  return NextResponse.json({
    jobId: job.id,
    topic: job.topic,
    status: job.status,
    progress: {
      stage: job.status,
      percent: job.progress_percent ?? 0,
    },
    lectureId: job.lecture_id,
    error: job.error_text,
    stageLog: job.stage_log,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
    ...(job.status === 'completed' && manifest ? {
      outputs: {
        videoUrl:     manifest.signedUrls?.video,
        notesUrl:     manifest.signedUrls?.notesJson,
        notesPdfUrl:  manifest.signedUrls?.notesPdf,
        quizUrl:      manifest.signedUrls?.quiz,
        timelineUrl:  manifest.signedUrls?.timeline,
        metadataUrl:  manifest.signedUrls?.metadata,
        manifestUrl:  manifest.signedUrls?.manifest,
        narrationUrl: manifest.signedUrls?.narrationMp3,
        subtitlesUrl: manifest.signedUrls?.subtitles,
        expiresAt:    manifest.expiresAt,
      },
    } : {}),
  });
}
