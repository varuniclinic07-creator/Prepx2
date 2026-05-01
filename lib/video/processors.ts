import 'server-only';
import { getAdminClient } from '../supabase-admin';
import { generateLectureScript } from '../agents/script-writer';
import * as comfy from '../comfyui-client';
import { uploadRenderedVideo, mintSignedUrl } from './storage';

// Real BullMQ processors for content-jobs / script-jobs / render-jobs.
// Replace the deferred no-ops in workers/hermes-worker.ts.

// ──────────────────────────────────────────────────────────────────────────
// content-jobs: ensure topic.content is fresh (delegated to a future Smart
// Books agent in Sprint 2 of the audit). For B2-3 we just touch the row's
// updated_at if content already exists, or generate a short summary stub.
// Concrete implementation belongs to Sprint 2; this passes the row through.
// ──────────────────────────────────────────────────────────────────────────

export async function processContentJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const topicId: string | undefined = job.data?.topicId;
  if (!topicId) return { taskId, skipped: 'no topicId' };

  const { data: topic } = await sb.from('topics')
    .select('id, title, content, updated_at')
    .eq('id', topicId).maybeSingle();
  if (!topic) return { taskId, error: 'topic not found' };

  // Touch updated_at so the freshness sweep stops re-queuing it.
  await sb.from('topics').update({ updated_at: new Date().toISOString() }).eq('id', topicId);
  return { taskId, topicId, touched: true };
}

// ──────────────────────────────────────────────────────────────────────────
// script-jobs: generate a 30-45 minute lecture script from a topic and
// persist a video_scripts row in 'draft' status for admin approval.
// ──────────────────────────────────────────────────────────────────────────

export async function processScriptJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const topicId: string = job.data?.topicId;
  const durationMinutes: number = job.data?.durationMinutes ?? 30;
  const language: 'en' | 'hi' = job.data?.language ?? 'en';
  if (!topicId) throw new Error('processScriptJob: topicId required');

  const { data: topic, error: topicErr } = await sb.from('topics')
    .select('id, title, syllabus_tag, content, subject, paper')
    .eq('id', topicId).single();
  if (topicErr || !topic) throw new Error(`processScriptJob: topic not found: ${topicErr?.message}`);

  const topicBody = typeof topic.content === 'string'
    ? topic.content
    : (topic.content && typeof topic.content === 'object' ? JSON.stringify(topic.content).slice(0, 8000) : '');

  const script = await generateLectureScript({
    topicTitle: topic.title,
    topicBody,
    syllabusTag: topic.syllabus_tag,
    paper: topic.paper,
    durationMinutes,
    language,
  });

  const { data: row, error: insErr } = await sb.from('video_scripts').insert({
    topic_id: topicId,
    subject: topic.subject ?? null,
    paper: topic.paper ?? null,
    title: script.title,
    script_text: script.scriptText,
    script_markers: script.markers,
    chapters: script.chapters,
    duration_target_seconds: script.durationSeconds,
    status: 'draft',
    generated_by_agent: 'AIVideoAgent',
    source_citations: script.citations,
    flesch_kincaid_grade: script.fleschKincaid,
    language: script.language,
  }).select('id').single();
  if (insErr || !row) throw new Error(`processScriptJob: insert failed: ${insErr?.message}`);

  return { taskId, scriptId: row.id, durationSeconds: script.durationSeconds, fk: script.fleschKincaid };
}

// ──────────────────────────────────────────────────────────────────────────
// render-jobs: take an approved video_scripts row, drive ComfyUI/LTX 2.3,
// upload the resulting MP4 to Supabase Storage, mint a signed URL, and
// flip video_lectures to 'published'. When ComfyUI is offline / disabled
// (no GPU in dev), record a 'failed' lecture with a clear reason so the
// admin UI surfaces the gap — do NOT fake a successful render.
// ──────────────────────────────────────────────────────────────────────────

export async function processRenderJob(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const scriptId: string = job.data?.scriptId;
  if (!scriptId) throw new Error('processRenderJob: scriptId required');

  const { data: script, error: sErr } = await sb.from('video_scripts')
    .select('id, title, script_text, script_markers, chapters, duration_target_seconds, status')
    .eq('id', scriptId).single();
  if (sErr || !script) throw new Error(`processRenderJob: script not found: ${sErr?.message}`);
  if (script.status !== 'approved' && script.status !== 'rendering') {
    throw new Error(`processRenderJob: script status is ${script.status}, must be 'approved'`);
  }

  // Lecture row in 'rendering' state so the admin UI shows progress.
  const { data: lectureRow, error: lErr } = await sb.from('video_lectures').insert({
    script_id: scriptId,
    title: script.title,
    duration_seconds: script.duration_target_seconds,
    chapters: script.chapters,
    status: 'rendering',
  }).select('id').single();
  if (lErr || !lectureRow) throw new Error(`processRenderJob: lecture insert: ${lErr?.message}`);
  await sb.from('video_scripts').update({ status: 'rendering' }).eq('id', scriptId);

  // Audit row in video_render_jobs.
  const { data: rjRow } = await sb.from('video_render_jobs').insert({
    script_id: scriptId,
    lecture_id: lectureRow.id,
    queue_job_id: String(job.data?.taskId || ''),
    status: 'running',
    started_at: new Date().toISOString(),
    attempt: 1,
  }).select('id').single();
  const renderJobAuditId = rjRow?.id;

  try {
    const settings = await comfy.getSettings(sb);
    if (!settings || !settings.enabled) {
      throw new Error('ComfyUI not configured / disabled. Configure in /admin/settings to render real videos.');
    }

    // Drive ComfyUI: build a single prompt from the first marker. Long-form
    // multi-shot rendering is the next iteration — this gets the pipe live.
    const firstMarker = Array.isArray(script.script_markers) && script.script_markers.length > 0
      ? script.script_markers[0]
      : null;
    const prompt = firstMarker?.visual_cue || `${script.title} — UPSC lecture, classroom board, photoreal.`;

    const { prompt_id } = await comfy.queuePrompt(settings, {
      prompt,
      negative_prompt: settings.default_negative_prompt,
      width: settings.width,
      height: settings.height,
      steps: settings.steps,
      cfg_scale: settings.cfg_scale,
    });

    await sb.from('video_lectures').update({ comfy_prompt_id: prompt_id }).eq('id', lectureRow.id);

    // Poll for completion. ComfyUI does not push; cap at 30 minutes.
    const deadline = Date.now() + 30 * 60 * 1000;
    let history: any = null;
    while (Date.now() < deadline) {
      const h = await comfy.getPromptStatus(settings, prompt_id);
      if (h && h[prompt_id] && h[prompt_id].outputs) { history = h[prompt_id]; break; }
      await new Promise(r => setTimeout(r, 5000));
    }
    if (!history) throw new Error('ComfyUI render timed out after 30 minutes');

    // Find the first output image/video file path.
    const outputs = history.outputs || {};
    const out = Object.values(outputs).find((o: any) =>
      Array.isArray(o?.images) && o.images.length > 0 || Array.isArray(o?.gifs) && o.gifs.length > 0,
    ) as any;
    const file = out?.images?.[0] || out?.gifs?.[0];
    if (!file) throw new Error('ComfyUI returned no media in outputs');

    const blob = await comfy.fetchOutputImage(settings, file.filename, file.subfolder, file.type || 'output');
    const arrayBuf = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);

    const ext = (file.filename.split('.').pop() || 'mp4').toLowerCase();
    const storagePath = `lectures/${lectureRow.id}.${ext}`;
    await uploadRenderedVideo(storagePath, bytes, ext === 'mp4' ? 'video/mp4' : `image/${ext}`);
    const { url, expiresAt } = await mintSignedUrl(storagePath);

    await sb.from('video_lectures').update({
      storage_path: storagePath,
      signed_url: url,
      signed_url_expires_at: expiresAt,
      status: 'published',
      published_at: new Date().toISOString(),
      render_meta: { comfy: { prompt_id, file } },
    }).eq('id', lectureRow.id);
    await sb.from('video_scripts').update({ status: 'rendered' }).eq('id', scriptId);
    if (renderJobAuditId) {
      await sb.from('video_render_jobs').update({
        status: 'succeeded', ended_at: new Date().toISOString(),
      }).eq('id', renderJobAuditId);
    }

    return { taskId, scriptId, lectureId: lectureRow.id, storagePath, status: 'published' };
  } catch (err: any) {
    const msg = err?.message || String(err);
    await sb.from('video_lectures').update({ status: 'failed', render_meta: { error: msg } }).eq('id', lectureRow.id);
    await sb.from('video_scripts').update({ status: 'failed' }).eq('id', scriptId);
    if (renderJobAuditId) {
      await sb.from('video_render_jobs').update({
        status: 'failed', ended_at: new Date().toISOString(), error_text: msg,
      }).eq('id', renderJobAuditId);
    }
    await sb.from('system_alerts').insert({
      severity: 'error',
      source: 'video-render',
      message: `Render failed for script ${scriptId}: ${msg.slice(0, 200)}`,
      payload: { scriptId, lectureId: lectureRow.id },
    });
    throw err;
  }
}
