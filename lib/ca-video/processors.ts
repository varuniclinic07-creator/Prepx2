import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { generateCaVideoScript } from '../agents/ca-video-script-writer';

// BullMQ processor for ca-video-jobs (Sprint 4-2).
//
// Flow:
//   1. Fetch the published bundle by bundleId or bundleDate.
//   2. Pull bundle articles with key_points.
//   3. Call generateCaVideoScript() → LLM generates 5-8 min script + SceneSpec beats.
//   4. Upsert ca_video_newspapers row with render_status='r3f_only'.
//   5. Return summary.

export async function processCaVideoJob(
  job: Job,
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const bundleId: string | undefined = job.data?.bundleId;
  const bundleDate: string | undefined = job.data?.bundleDate;

  if (!bundleId && !bundleDate) {
    throw new Error('processCaVideoJob: bundleId or bundleDate required');
  }

  // Fetch the published bundle.
  let query = sb
    .from('ca_daily_bundles')
    .select('id, bundle_date, theme, subtitle, summary, status, article_count');
  if (bundleId) {
    query = query.eq('id', bundleId);
  } else {
    query = query.eq('bundle_date', bundleDate!);
  }
  const { data: bundle, error: bundleErr } = await query.maybeSingle();
  if (bundleErr || !bundle) {
    throw new Error(`processCaVideoJob: bundle not found: ${bundleErr?.message || 'no row'}`);
  }
  if (bundle.status !== 'published') {
    return { taskId, bundleId: bundle.id, skipped: true, reason: `bundle status is '${bundle.status}', not 'published'` };
  }

  // Pull bundle articles.
  const { data: linkRows, error: linkErr } = await sb
    .from('ca_bundle_articles')
    .select('article_id, relevance, key_points, position, cluster_label, research_articles(id, title, source_url, summary, source_id)')
    .eq('bundle_id', bundle.id)
    .order('position', { ascending: true });

  if (linkErr) {
    throw new Error(`processCaVideoJob: articles fetch failed: ${linkErr.message}`);
  }

  const articles = (linkRows || []).map((row: any) => ({
    title: row.research_articles?.title || '(untitled)',
    source: row.research_articles?.source_id || 'unknown',
    summary: row.research_articles?.summary || null,
    keyPoints: Array.isArray(row.key_points) ? row.key_points : [],
    relevance: row.relevance || 'both',
  }));

  if (articles.length === 0) {
    return { taskId, bundleId: bundle.id, skipped: true, reason: 'no articles in bundle' };
  }

  // Generate script via LLM.
  const script = await generateCaVideoScript({
    bundleDate: bundle.bundle_date as string,
    theme: bundle.theme as string,
    subtitle: bundle.subtitle as string | null,
    summary: bundle.summary as string,
    articles,
  });

  // Check if a video newspaper already exists for this bundle.
  const { data: existing } = await sb
    .from('ca_video_newspapers')
    .select('id')
    .eq('bundle_id', bundle.id)
    .maybeSingle();

  let videoId: string;
  const row = {
    bundle_id: bundle.id,
    bundle_date: bundle.bundle_date,
    title: script.title,
    theme: script.theme,
    script_text: script.scriptText,
    script_markers: script.beats.map(b => ({
      startMs: b.startMs,
      endMs: b.endMs,
      segmentType: b.segmentType,
      visual_cue: b.voiceover.text,
    })),
    scene_specs: script.beats.map(b => b.scene),
    duration_seconds: script.durationSeconds,
    render_status: 'r3f_only',
    approval_status: 'pending',
    generated_by: script.generatedBy,
  };

  if (existing) {
    videoId = existing.id as string;
    const { error: updErr } = await sb
      .from('ca_video_newspapers')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', videoId);
    if (updErr) throw new Error(`processCaVideoJob: update failed: ${updErr.message}`);
  } else {
    const { data: inserted, error: insErr } = await sb
      .from('ca_video_newspapers')
      .insert(row)
      .select('id')
      .single();
    if (insErr || !inserted) throw new Error(`processCaVideoJob: insert failed: ${insErr?.message}`);
    videoId = inserted.id as string;
  }

  return {
    taskId,
    videoId,
    bundleId: bundle.id,
    bundleDate: bundle.bundle_date,
    title: script.title,
    beats: script.beats.length,
    durationSeconds: script.durationSeconds,
  };
}
