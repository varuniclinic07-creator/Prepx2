// Multi-shot render orchestrator. Replaces the single-prompt logic in the
// legacy processRenderJob. Decomposes a script into shots, persists them,
// dispatches each via the per-kind renderer, and writes an ffmpeg merge
// manifest into video_lectures.render_meta. The bake-bridge / merge worker
// (next slice) consumes the manifest to produce the final MP4.

import { getAdminClient } from '../supabase-admin';
import * as comfy from '../comfyui-client';
import { decomposeMarkers, type DecomposedShot } from './shot-decomposer';
import { dispatchShot, type ShotRenderResult } from './shot-renderers';

interface MergeManifestEntry {
  position: number;
  kind: DecomposedShot['kind'];
  start_seconds: number;
  duration_seconds: number;
  media_path: string | null;
  status: ShotRenderResult['status'];
}

export async function processRenderJobMultiShot(
  job: { data: Record<string, any> },
  taskId: string,
): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const scriptId: string = job.data?.scriptId;
  if (!scriptId) throw new Error('processRenderJobMultiShot: scriptId required');

  const { data: script, error: sErr } = await sb.from('video_scripts')
    .select('id, title, script_text, script_markers, chapters, duration_target_seconds, status')
    .eq('id', scriptId).single();
  if (sErr || !script) throw new Error(`script not found: ${sErr?.message}`);
  if (script.status !== 'approved' && script.status !== 'rendering') {
    throw new Error(`script status is ${script.status}, must be 'approved'`);
  }

  const { data: lectureRow, error: lErr } = await sb.from('video_lectures').insert({
    script_id: scriptId,
    title: script.title,
    duration_seconds: script.duration_target_seconds,
    chapters: script.chapters,
    status: 'rendering',
  }).select('id').single();
  if (lErr || !lectureRow) throw new Error(`lecture insert: ${lErr?.message}`);
  await sb.from('video_scripts').update({ status: 'rendering' }).eq('id', scriptId);

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
    const shots = decomposeMarkers(script.script_markers, {
      title: script.title,
      durationSeconds: script.duration_target_seconds,
    });

    // Persist shot rows up-front so the admin UI can show progress per-shot.
    const shotRows = shots.map(s => ({
      lecture_id: lectureRow.id,
      script_id: scriptId,
      position: s.position,
      kind: s.kind,
      start_seconds: s.start_seconds,
      duration_seconds: s.duration_seconds,
      visual_cue: s.visual_cue,
      narration_chunk: s.narration_chunk,
      prompt: s.prompt,
      status: 'queued' as const,
    }));
    const { error: shotsErr } = await sb.from('video_shots').insert(shotRows);
    if (shotsErr) throw new Error(`video_shots insert: ${shotsErr.message}`);

    const settings = await comfy.getSettings(sb);
    const comfyEnabled = !!(settings && settings.enabled);

    // Dispatch shots. Comfy shots go sequentially (single GPU); title/manim/
    // narration manifests build instantly and can be parallelised — but the
    // overall cost is dominated by Comfy, so a simple sequential loop keeps
    // ordering and database writes obvious.
    const merge: MergeManifestEntry[] = [];
    for (const shot of shots) {
      await sb.from('video_shots').update({
        status: 'rendering', attempt: 1,
      }).eq('lecture_id', lectureRow.id).eq('position', shot.position);

      const result = await dispatchShot(lectureRow.id, shot, comfyEnabled, settings);

      await sb.from('video_shots').update({
        status: result.status,
        manifest: result.manifest,
        media_path: result.media_path,
        error_text: result.error_text || null,
      }).eq('lecture_id', lectureRow.id).eq('position', shot.position);

      merge.push({
        position: shot.position,
        kind: shot.kind,
        start_seconds: shot.start_seconds,
        duration_seconds: shot.duration_seconds,
        media_path: result.media_path,
        status: result.status,
      });
    }

    // Pipeline is honest about what's baked vs deferred:
    //   - succeeded shots: ready to merge.
    //   - queued shots: manifest persisted, awaiting bake worker.
    //   - failed shots: surface to admin.
    const failed = merge.filter(m => m.status === 'failed').length;
    const queued = merge.filter(m => m.status === 'queued').length;
    const succeeded = merge.filter(m => m.status === 'succeeded').length;

    const lectureStatus = failed === merge.length
      ? 'failed'
      : queued > 0
        ? 'awaiting_bake'  // partial — bake worker will finish
        : 'composing';     // all shots have media, merge step pending

    await sb.from('video_lectures').update({
      status: lectureStatus,
      render_meta: {
        merge_manifest: merge,
        shot_counts: { total: merge.length, succeeded, queued, failed },
      },
    }).eq('id', lectureRow.id);

    if (renderJobAuditId) {
      await sb.from('video_render_jobs').update({
        status: failed === merge.length ? 'failed' : 'succeeded',
        ended_at: new Date().toISOString(),
        error_text: failed > 0 ? `${failed}/${merge.length} shots failed` : null,
      }).eq('id', renderJobAuditId);
    }

    return {
      taskId,
      scriptId,
      lectureId: lectureRow.id,
      shots: merge.length,
      succeeded, queued, failed,
      status: lectureStatus,
    };
  } catch (err: any) {
    const msg = err?.message || String(err);
    await sb.from('video_lectures').update({
      status: 'failed', render_meta: { error: msg },
    }).eq('id', lectureRow.id);
    await sb.from('video_scripts').update({ status: 'failed' }).eq('id', scriptId);
    if (renderJobAuditId) {
      await sb.from('video_render_jobs').update({
        status: 'failed', ended_at: new Date().toISOString(), error_text: msg,
      }).eq('id', renderJobAuditId);
    }
    await sb.from('system_alerts').insert({
      severity: 'error',
      source: 'video-render-multi-shot',
      message: `Multi-shot render failed for script ${scriptId}: ${msg.slice(0, 200)}`,
      payload: { scriptId, lectureId: lectureRow.id },
    });
    throw err;
  }
}
