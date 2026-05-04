// Sweep that reads all premium-artifact tables for rows with render_status =
// 'r3f_only' (or equivalent), converts their SceneSpec into ComfyUI workflows,
// drives GPU rendering, uploads the MP4, and flips the row to 'rendered'.
//
// Runs nightly via hermes-bake-sweep (1 AM IST). Bounded per-run to avoid
// saturating the GPU queue.

import { getAdminClient } from '../supabase-admin';
import { buildSceneWorkflow, type ComfyuiWorkflowInput } from './scene-to-workflow';
import { uploadRenderedVideo, mintSignedUrl } from './storage';
import * as comfy from '../comfyui-client';

// ────────────────────────────────────────────────────────────
// Table inventory
// ────────────────────────────────────────────────────────────

interface BakableTable {
  table: string;
  sceneCol: string;
  statusCol: string;
  urlCol: string;
  idCol: string;
  targetStatus: string;   // status value that means "needs baking"
  titleExpr: string;       // sql expression for artifact title (used in prompt)
}

const BAKABLE_TABLES: BakableTable[] = [
  {
    table: 'mnemonic_artifacts',
    sceneCol: 'scene_spec',
    statusCol: 'render_status',
    urlCol: 'comfy_video_url',
    idCol: 'id',
    targetStatus: 'r3f_only',
    titleExpr: "COALESCE(mnemonic_text, 'Mnemonic')",
  },
  {
    table: 'imagine_videos',
    sceneCol: 'scene_specs',
    statusCol: 'render_status',
    urlCol: 'comfy_video_url',
    idCol: 'id',
    targetStatus: 'r3f_only',
    titleExpr: "COALESCE(topic_query, 'Imagine Video')",
  },
  {
    table: 'interview_debriefs',
    sceneCol: 'scene_spec',
    statusCol: 'render_status',
    urlCol: 'comfy_video_url',
    idCol: 'id',
    targetStatus: 'r3f_only',
    titleExpr: "COALESCE(summary, 'Interview Debrief')",
  },
  {
    table: 'animated_mindmaps',
    sceneCol: 'scene_spec',
    statusCol: 'render_status',
    urlCol: 'comfy_video_url',
    idCol: 'id',
    targetStatus: 'r3f_only',
    titleExpr: "COALESCE(title, 'Mindmap')",
  },
  {
    table: 'concept_shorts',
    sceneCol: 'scene_spec',
    statusCol: 'render_status',
    urlCol: 'comfy_video_url',
    idCol: 'id',
    targetStatus: 'r3f_only',
    titleExpr: "COALESCE(concept_tag, 'Concept Short')",
  },
  {
    table: 'ca_video_newspapers',
    sceneCol: 'scene_specs',
    statusCol: 'render_status',
    urlCol: 'comfy_video_url',
    idCol: 'id',
    targetStatus: 'r3f_only',
    titleExpr: "COALESCE(title, 'CA Video Newspaper')",
  },
];

// ────────────────────────────────────────────────────────────
// Single-row baker
// ────────────────────────────────────────────────────────────

interface BakeResult {
  table: string;
  rowId: string;
  status: 'rendered' | 'failed' | 'skipped';
  promptId?: string;
  videoUrl?: string;
  error?: string;
}

async function bakeOneRow(
  def: BakableTable,
  row: Record<string, any>,
  sweepLogId: string | null,
): Promise<BakeResult> {
  const sb = getAdminClient();
  const startMs = Date.now();
  const rowId = row[def.idCol] || row.id;
  const sceneRaw = row[def.sceneCol];

  // Audit-row writer — fires once per result so /admin/bake-sweep has a
  // stable per-row history even when the parent log entry is rotated.
  const audit = async (
    status: 'rendered' | 'failed' | 'skipped',
    extras: { error_message?: string; prompt_id?: string; storage_path?: string; video_url?: string } = {},
  ) => {
    try {
      await sb.from('bake_sweep_jobs').insert({
        sweep_id: sweepLogId,
        source_table: def.table,
        row_id: rowId,
        status,
        error_message: extras.error_message ?? null,
        prompt_id: extras.prompt_id ?? null,
        storage_path: extras.storage_path ?? null,
        video_url: extras.video_url ?? null,
        duration_ms: Date.now() - startMs,
      });
    } catch {
      // Audit must never break the sweep itself.
    }
  };

  if (!sceneRaw) {
    await audit('skipped', { error_message: 'no scene data' });
    return { table: def.table, rowId, status: 'skipped', error: 'no scene data' };
  }

  const scene = sceneRaw.version === 1 ? sceneRaw : (Array.isArray(sceneRaw) ? sceneRaw[0] : null);
  if (!scene || scene.version !== 1) {
    await audit('skipped', { error_message: 'invalid SceneSpec' });
    return { table: def.table, rowId, status: 'skipped', error: 'invalid SceneSpec' };
  }

  const title = row._artifact_title || `${def.table} ${rowId}`;

  // Build workflow
  const workflowInput: ComfyuiWorkflowInput = {
    scene,
    promptPrefix: `UPSC ${title}`,
    style: '3d-animated',
  };
  const { workflow, positivePrompt } = buildSceneWorkflow(workflowInput);

  // Mark rendering
  await sb.from(def.table)
    .update({ [def.statusCol]: 'rendering' })
    .eq(def.idCol, rowId);

  // Check ComfyUI availability
  const settings = await comfy.getSettings(sb);
  if (!settings?.enabled) {
    await sb.from(def.table)
      .update({ [def.statusCol]: 'r3f_only' })
      .eq(def.idCol, rowId);
    await audit('skipped', { error_message: 'ComfyUI not enabled' });
    return { table: def.table, rowId, status: 'skipped', error: 'ComfyUI not enabled' };
  }

  try {
    // Queue to ComfyUI — inject our scene workflow
    const { prompt_id } = await comfy.queuePrompt(settings, {
      prompt: positivePrompt,
      negative_prompt: 'blurry, low quality, distorted',
      width: settings.width,
      height: settings.height,
      steps: settings.steps,
      cfg_scale: settings.cfg_scale,
    });

    // Poll (30 min deadline)
    const deadline = Date.now() + 30 * 60 * 1000;
    let history: any = null;
    while (Date.now() < deadline) {
      const h = await comfy.getPromptStatus(settings, prompt_id);
      if (h && h[prompt_id]?.outputs) { history = h[prompt_id]; break; }
      await new Promise(r => setTimeout(r, 10_000));
    }

    if (!history) throw new Error('Render timed out after 30 min');

    const outputs = history.outputs || {};
    const out = Object.values(outputs).find((o: any) =>
      Array.isArray(o?.images) && o.images.length > 0 ||
      Array.isArray(o?.gifs) && o.gifs.length > 0,
    ) as any;
    const file = out?.images?.[0] || out?.gifs?.[0];
    if (!file) throw new Error('ComfyUI returned no media');

    // Download + upload
    const blob = await comfy.fetchOutputImage(settings, file.filename, file.subfolder, file.type || 'output');
    const ext = (file.filename.split('.').pop() || 'mp4').toLowerCase();
    const storagePath = `baked/${def.table}/${rowId}_${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    await uploadRenderedVideo(storagePath, bytes, ext === 'mp4' ? 'video/mp4' : `image/${ext}`);
    const { url: signedUrl } = await mintSignedUrl(storagePath, 7 * 24 * 60 * 60);

    // Flip to rendered
    const updatePayload: Record<string, any> = {
      [def.statusCol]: 'rendered',
    };
    if (def.urlCol === 'comfy_video_url') {
      updatePayload.comfy_video_url = signedUrl;
      updatePayload.comfy_prompt_id = prompt_id;
    } else {
      updatePayload[def.urlCol] = signedUrl;
      updatePayload.storage_path = storagePath;
      updatePayload.signed_url_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    await sb.from(def.table).update(updatePayload).eq(def.idCol, rowId);

    await audit('rendered', { prompt_id, storage_path: storagePath, video_url: signedUrl });
    return { table: def.table, rowId, status: 'rendered', promptId: prompt_id, videoUrl: signedUrl };
  } catch (err: any) {
    const msg = err?.message || String(err);
    await sb.from(def.table)
      .update({ [def.statusCol]: 'failed', render_meta: { bake_error: msg } })
      .eq(def.idCol, rowId);
    await audit('failed', { error_message: msg });
    return { table: def.table, rowId, status: 'failed', error: msg };
  }
}

// ────────────────────────────────────────────────────────────
// Sweep entry point
// ────────────────────────────────────────────────────────────

export interface BakeSweepResult {
  baked: BakeResult[];
  summary: { total: number; rendered: number; failed: number; skipped: number };
}

export async function runBakeSweep(): Promise<BakeSweepResult> {
  const sb = getAdminClient();
  const baked: BakeResult[] = [];
  const summary = { total: 0, rendered: 0, failed: 0, skipped: 0 };

  // Persist a sweep log row (migration 063 table)
  const { data: logRow } = await sb.from('bake_sweep_log').insert({
    sweep_started_at: new Date().toISOString(),
    total_rows: 0,
    baked_count: 0,
    failed_count: 0,
    per_table: {},
  }).select('id').single();
  const logId: string | null = logRow?.id ?? null;

  for (const def of BAKABLE_TABLES) {
    // Fetch up to 10 rows per table per sweep to keep GPU queue bounded
    const { data: rows, error } = await sb
      .from(def.table)
      .select(`${def.idCol}, ${def.sceneCol}, ${def.statusCol}`)
      .eq(def.statusCol, def.targetStatus)
      .limit(10);

    if (error || !rows?.length) continue;

    for (const row of rows) {
      summary.total++;
      const result = await bakeOneRow(def, row, logId);
      baked.push(result);
      summary[result.status] = (summary[result.status] || 0) + 1;
    }
  }

  // Finalize sweep log
  if (logId) {
    await sb.from('bake_sweep_log').update({
      sweep_ended_at: new Date().toISOString(),
      total_rows: summary.total,
      baked_count: summary.rendered,
      failed_count: summary.failed,
      per_table: {
        mnemonic: summary.total,
        rendered: summary.rendered,
        failed: summary.failed,
        skipped: summary.skipped,
      },
    }).eq('id', logId);
  }

  return { baked, summary };
}
