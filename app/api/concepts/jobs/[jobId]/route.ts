import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getAdminClient } from '@/lib/supabase-admin';
import { mintConceptSignedUrl } from '@/lib/concept/storage';

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

  const { data: job, error } = await supabase
    .from('concept_jobs')
    .select('id, user_id, concept_id, document_name, document_type, detected_topic, detected_concepts, status, progress_percent, source_text_excerpt, storage_prefix, manifest, metadata, stage_log, error_text, lecture_job_id, created_at, updated_at, completed_at')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Refresh signed URLs if expiring within an hour.
  let manifest = job.manifest as any;
  if (job.status === 'completed' && manifest?.signedUrls && job.storage_prefix) {
    const expiresAt = manifest.expiresAt ? new Date(manifest.expiresAt).getTime() : 0;
    const stale = !expiresAt || expiresAt - Date.now() < 60 * 60 * 1000;
    if (stale) {
      const refreshed: Record<string, string> = {};
      const candidates = ['explainer.mp4', 'notes.json', 'notes.pdf', 'quiz.json', 'recap.json', 'timeline.json', 'metadata.json', 'manifest.json', 'narration.mp3', 'subtitles.srt'];
      for (const name of candidates) {
        try {
          const { url } = await mintConceptSignedUrl(`${job.storage_prefix}/${name}`);
          refreshed[name] = url;
        } catch { /* skip absent */ }
      }
      manifest = {
        ...manifest,
        signedUrls: {
          explainer: refreshed['explainer.mp4'] ?? manifest.signedUrls.explainer,
          notesJson: refreshed['notes.json']    ?? manifest.signedUrls.notesJson,
          notesPdf:  refreshed['notes.pdf']     ?? manifest.signedUrls.notesPdf,
          quiz:      refreshed['quiz.json']     ?? manifest.signedUrls.quiz,
          recap:     refreshed['recap.json']    ?? manifest.signedUrls.recap,
          timeline:  refreshed['timeline.json'] ?? manifest.signedUrls.timeline,
          metadata:  refreshed['metadata.json'] ?? manifest.signedUrls.metadata,
          manifest:  refreshed['manifest.json'] ?? manifest.signedUrls.manifest,
          ...(refreshed['narration.mp3'] ? { narrationMp3: refreshed['narration.mp3'] } : {}),
          ...(refreshed['subtitles.srt'] ? { subtitles:    refreshed['subtitles.srt'] } : {}),
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
      try {
        const admin = getAdminClient();
        await admin.from('concept_jobs').update({ manifest }).eq('id', jobId);
      } catch { /* best-effort */ }
    }
  }

  return NextResponse.json({
    jobId: job.id,
    conceptId: job.concept_id,
    documentName: job.document_name,
    documentType: job.document_type,
    detectedTopic: job.detected_topic,
    detectedConcepts: job.detected_concepts,
    sourceExcerpt: job.source_text_excerpt,
    status: job.status,
    progress: { stage: job.status, percent: job.progress_percent ?? 0 },
    error: job.error_text,
    stageLog: job.stage_log,
    lectureJobId: job.lecture_job_id,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
    ...(job.status === 'completed' && manifest ? {
      outputs: {
        explainerUrl: manifest.signedUrls?.explainer,
        notesUrl:     manifest.signedUrls?.notesJson,
        notesPdfUrl:  manifest.signedUrls?.notesPdf,
        quizUrl:      manifest.signedUrls?.quiz,
        recapUrl:     manifest.signedUrls?.recap,
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
