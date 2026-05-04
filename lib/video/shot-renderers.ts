// Per-shot renderers. Each returns the data needed to update the matching
// video_shots row: a manifest (always), and optionally a media_path once a
// pixel/video file is on Supabase Storage.
//
// - renderTitleShot: builds a Remotion JSON manifest. Bake step is deferred to
//   the existing bake-bridge so the pipeline doesn't block on Node-side
//   Remotion render — the worker only needs the shot recipe persisted.
// - renderManimShot: same shape, for a Manim CLI bake.
// - renderComfyShot: drives ComfyUI synchronously (it's the only renderer
//   already wired) and uploads the result to storage.

import * as comfy from '../comfyui-client';
import { uploadRenderedVideo } from './storage';
import type { DecomposedShot } from './shot-decomposer';

export interface ShotRenderResult {
  manifest: Record<string, any>;
  media_path: string | null;
  status: 'succeeded' | 'failed' | 'queued';
  error_text?: string;
}

export async function renderTitleShot(
  lectureId: string,
  shot: DecomposedShot,
): Promise<ShotRenderResult> {
  // Pure manifest — the bake worker (or Remotion sidecar) consumes this.
  const manifest = {
    type: 'remotion-title',
    composition: 'TitleCard',
    inputProps: {
      title: shot.visual_cue || shot.narration_chunk.slice(0, 80),
      subtitle: shot.narration_chunk.slice(0, 200),
      durationInFrames: Math.max(30, shot.duration_seconds * 30),
      fps: 30,
    },
    out: `lectures/${lectureId}/shots/${shot.position}.mp4`,
  };
  return { manifest, media_path: null, status: 'queued' };
}

export async function renderManimShot(
  lectureId: string,
  shot: DecomposedShot,
): Promise<ShotRenderResult> {
  const manifest = {
    type: 'manim-scene',
    scene_class: 'AutoEquation',
    description: shot.visual_cue,
    narration: shot.narration_chunk,
    duration_seconds: shot.duration_seconds,
    quality: 'medium',
    out: `lectures/${lectureId}/shots/${shot.position}.mp4`,
  };
  return { manifest, media_path: null, status: 'queued' };
}

export async function renderNarrationShot(
  lectureId: string,
  shot: DecomposedShot,
): Promise<ShotRenderResult> {
  // Voice-only / TTS shot (no visual). The audio bake also goes through the
  // existing bake bridge; we just record the recipe.
  const manifest = {
    type: 'narration-only',
    text: shot.narration_chunk,
    duration_seconds: shot.duration_seconds,
    out: `lectures/${lectureId}/shots/${shot.position}.mp3`,
  };
  return { manifest, media_path: null, status: 'queued' };
}

export async function renderComfyShot(
  lectureId: string,
  shot: DecomposedShot,
  settings: comfy.ComfyUISettings,
): Promise<ShotRenderResult> {
  try {
    const { prompt_id } = await comfy.queuePrompt(settings, {
      prompt: shot.prompt,
      negative_prompt: settings.default_negative_prompt,
      width: settings.width,
      height: settings.height,
      steps: settings.steps,
      cfg_scale: settings.cfg_scale,
    });

    const deadline = Date.now() + 30 * 60 * 1000;
    let history: any = null;
    while (Date.now() < deadline) {
      const h = await comfy.getPromptStatus(settings, prompt_id);
      if (h && h[prompt_id] && h[prompt_id].outputs) { history = h[prompt_id]; break; }
      await new Promise(r => setTimeout(r, 5000));
    }
    if (!history) {
      return {
        manifest: { type: 'comfy', prompt_id, prompt: shot.prompt },
        media_path: null,
        status: 'failed',
        error_text: 'ComfyUI render timed out after 30 minutes',
      };
    }

    const outputs = history.outputs || {};
    const out = Object.values(outputs).find((o: any) =>
      (Array.isArray(o?.images) && o.images.length > 0) ||
      (Array.isArray(o?.gifs) && o.gifs.length > 0),
    ) as any;
    const file = out?.images?.[0] || out?.gifs?.[0];
    if (!file) {
      return {
        manifest: { type: 'comfy', prompt_id, prompt: shot.prompt },
        media_path: null,
        status: 'failed',
        error_text: 'ComfyUI returned no media',
      };
    }

    const blob = await comfy.fetchOutputImage(
      settings, file.filename, file.subfolder, file.type || 'output',
    );
    const arrayBuf = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuf);
    const ext = (file.filename.split('.').pop() || 'mp4').toLowerCase();
    const storagePath = `lectures/${lectureId}/shots/${shot.position}.${ext}`;
    await uploadRenderedVideo(
      storagePath, bytes,
      ext === 'mp4' ? 'video/mp4' : `image/${ext}`,
    );

    return {
      manifest: { type: 'comfy', prompt_id, file, prompt: shot.prompt },
      media_path: storagePath,
      status: 'succeeded',
    };
  } catch (err: any) {
    return {
      manifest: { type: 'comfy', prompt: shot.prompt },
      media_path: null,
      status: 'failed',
      error_text: err?.message || String(err),
    };
  }
}

export async function dispatchShot(
  lectureId: string,
  shot: DecomposedShot,
  comfyEnabled: boolean,
  settings: comfy.ComfyUISettings | null,
): Promise<ShotRenderResult> {
  switch (shot.kind) {
    case 'title':     return renderTitleShot(lectureId, shot);
    case 'manim':     return renderManimShot(lectureId, shot);
    case 'narration': return renderNarrationShot(lectureId, shot);
    case 'comfy': {
      if (!comfyEnabled || !settings) {
        return {
          manifest: { type: 'comfy', prompt: shot.prompt, deferred: true },
          media_path: null,
          status: 'queued',
          error_text: 'ComfyUI disabled — manifest persisted for later bake',
        };
      }
      return renderComfyShot(lectureId, shot, settings);
    }
  }
}
