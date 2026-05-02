import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { aiChat } from '../ai-router';
import { parseSceneSpec, type SceneSpec } from '../3d/scene-spec';
import type { ImagineVideoJobPayload } from '../queue/types';

// Sprint 3 / S3-2 — Topic-Imagination Video processor.
//
// Two modes share this entry point:
//   1) Generate: payload.videoId points at an empty pre-inserted row; we fill
//      voiceover_segments + scene_specs + syllabus_tag.
//   2) Extend:   payload.extendVideoId points at an existing video; we append
//      ~30s of deeper beats to the same row, bumping duration_seconds.
//
// Output JSON shape from aiChat:
//   { syllabusTag, beats: [{ startMs, endMs, voiceover:{text,voice}, scene }, ...] }
// Each scene is a SceneSpec validated by parseSceneSpec; bad scenes are dropped
// in favour of a safe placeholder so the pipeline never returns zero beats.

interface BeatLLM {
  startMs: number;
  endMs: number;
  voiceover: { text: string; voice: 'male_in' | 'female_in' };
  scene: unknown;
}

interface ImagineLLMResponse {
  syllabusTag: string;
  beats: BeatLLM[];
}

interface VoiceoverSegment {
  startMs: number;
  endMs: number;
  text: string;
  voice: 'male_in' | 'female_in';
}

const MIN_DURATION = 15;
const MAX_DURATION = 600;
const BEAT_MIN_SECONDS = 5;
const BEAT_MAX_SECONDS = 12;

function clampDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return 60;
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, Math.round(seconds)));
}

function safeFallbackScene(durationSeconds: number, label: string): SceneSpec {
  return {
    version: 1,
    background: 'primary',
    durationSeconds,
    ambientIntensity: 0.6,
    meshes: [
      { kind: 'icosahedron', position: [0, 0.5, 0], scale: 1.2, color: 'cyan', emissive: true, label },
      { kind: 'torus',       position: [0, 0.5, 0], scale: 2.2, rotation: [1.2, 0, 0], color: 'primary' },
      { kind: 'sphere',      position: [-2, 0.2, 0], scale: 0.4, color: 'gold', emissive: true },
      { kind: 'sphere',      position: [2, 0.2, 0],  scale: 0.4, color: 'magenta', emissive: true },
    ],
    cameraKeyframes: [
      { timeSeconds: 0,                        position: [0, 1.5, 6],  lookAt: [0, 0.5, 0] },
      { timeSeconds: durationSeconds * 0.5,    position: [4, 2,   4],  lookAt: [0, 0.5, 0] },
      { timeSeconds: durationSeconds,          position: [-3, 1.5, 5], lookAt: [0, 0.5, 0] },
    ],
    labels: [
      { timeSeconds: 0.5,                      position: [0, 2.2, 0], text: label, durationSeconds: durationSeconds - 1, size: 0.4 },
    ],
  };
}

function buildSystemPrompt(): string {
  return [
    'You are PrepX Imagine — a 3D-VFX explainer engine.',
    'You receive a topic from a UPSC student (or any curious learner) and produce a JSON-only beat list that drives a React Three Fiber scene renderer.',
    'Hard rules:',
    ' - Plain easy English. No jargon, no Sanskrit, no Latin. Each voiceover ≤25 words.',
    ' - Every beat MUST include a SceneSpec with 3-7 meshes, 2-3 camera keyframes, and 1-3 floating labels containing the key terms.',
    ' - Pick a single best syllabus tag. Examples: history.ancient, history.medieval, history.modern, polity.constitution, geography.physical, geography.human, science.cosmology, science.biology, science.physics, economy.basics, environment.climate, current.affairs. Use general.exploration only when no UPSC tag fits.',
    ' - Beats must be contiguous (no gaps, no overlap). Each beat is 5-12 seconds. Sum of beat lengths must equal the requested duration ±2 seconds.',
    ' - Voice alternates per beat (male_in / female_in) for variety; first beat is male_in.',
    ' - Output JSON ONLY. No prose, no markdown.',
  ].join('\n');
}

function buildUserPrompt(topicQuery: string, durationSeconds: number, mode: 'generate' | 'extend', priorBeatsRecap?: string): string {
  const sceneSpecExample = `{
  "version": 1,
  "background": "primary",
  "durationSeconds": 8,
  "meshes": [
    { "kind": "sphere",      "position": [0, 0.5, 0], "scale": 1.5, "color": "saffron", "emissive": true, "label": "Sun" },
    { "kind": "sphere",      "position": [3, 0.5, 0], "scale": 0.4, "color": "cyan",                       "label": "Earth" },
    { "kind": "icosahedron", "position": [-3, 1.5, -2], "scale": 0.6, "color": "magenta", "emissive": true }
  ],
  "cameraKeyframes": [
    { "timeSeconds": 0, "position": [0, 2, 8], "lookAt": [0, 0.5, 0] },
    { "timeSeconds": 8, "position": [4, 3, 6], "lookAt": [0, 0.5, 0] }
  ],
  "labels": [
    { "timeSeconds": 0.5, "position": [0, 2.5, 0], "text": "Solar System", "durationSeconds": 7, "size": 0.4 }
  ],
  "ambientIntensity": 0.6
}`;

  const responseShape = `{
  "syllabusTag": "<best tag>",
  "beats": [
    {
      "startMs": 0,
      "endMs": 8000,
      "voiceover": { "text": "...", "voice": "male_in" },
      "scene": <SceneSpec like example above with durationSeconds = (endMs-startMs)/1000>
    }
  ]
}`;

  const intro = mode === 'extend'
    ? `EXTEND MODE — the user wants ~${durationSeconds} additional seconds of deeper detail on the SAME topic. Your beats will be APPENDED after the prior beats below. Do NOT repeat earlier points; go deeper or cover the next chronological/conceptual chunk.\n\nPrior beats recap:\n${priorBeatsRecap}`
    : `GENERATE MODE — produce a complete ${durationSeconds}-second 3D explainer for the topic.`;

  return [
    intro,
    '',
    `Topic: "${topicQuery}"`,
    `Total duration to fill: ${durationSeconds} seconds.`,
    '',
    'Example SceneSpec for one beat (do not copy verbatim — design for the topic):',
    sceneSpecExample,
    '',
    'Required response shape (JSON only, no markdown fences):',
    responseShape,
  ].join('\n');
}

function tryParseLLM(raw: string): ImagineLLMResponse | null {
  const trimmed = raw.trim();
  // Strip ``` fences if the model insists on them despite jsonMode.
  const stripped = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const obj = JSON.parse(stripped);
    if (!obj || typeof obj !== 'object') return null;
    if (!Array.isArray(obj.beats)) return null;
    return obj as ImagineLLMResponse;
  } catch {
    // Last-ditch: extract the first {...} block.
    const m = stripped.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const obj = JSON.parse(m[0]);
      if (!Array.isArray(obj.beats)) return null;
      return obj as ImagineLLMResponse;
    } catch {
      return null;
    }
  }
}

function normaliseBeats(
  beats: BeatLLM[],
  startOffsetMs: number,
  topicQuery: string,
): { voiceoverSegments: VoiceoverSegment[]; sceneSpecs: SceneSpec[]; totalSeconds: number } {
  const voiceoverSegments: VoiceoverSegment[] = [];
  const sceneSpecs: SceneSpec[] = [];
  let cursor = startOffsetMs;

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const rawStart = Number.isFinite(b?.startMs) ? Number(b.startMs) : cursor;
    const rawEnd   = Number.isFinite(b?.endMs)   ? Number(b.endMs)   : rawStart + 8000;
    let span = rawEnd - rawStart;
    if (!Number.isFinite(span) || span <= 0) span = 8000;
    span = Math.max(BEAT_MIN_SECONDS * 1000, Math.min(BEAT_MAX_SECONDS * 1000, Math.round(span)));

    const startMs = cursor;
    const endMs = cursor + span;
    cursor = endMs;

    const voice = b?.voiceover?.voice === 'female_in' ? 'female_in' : (i % 2 === 0 ? 'male_in' : 'female_in');
    const text = (b?.voiceover?.text || `Continuing the explanation of ${topicQuery}.`).trim().slice(0, 280);

    voiceoverSegments.push({ startMs, endMs, text, voice });

    const parsed = parseSceneSpec(b?.scene);
    const beatSeconds = span / 1000;
    if (parsed && Array.isArray(parsed.meshes) && parsed.meshes.length >= 1) {
      // Force scene durationSeconds to match the beat span so the renderer's
      // camera/label timeline lines up with voiceover timing.
      sceneSpecs.push({ ...parsed, durationSeconds: beatSeconds });
    } else {
      sceneSpecs.push(safeFallbackScene(beatSeconds, topicQuery.slice(0, 32)));
    }
  }

  return {
    voiceoverSegments,
    sceneSpecs,
    totalSeconds: Math.round((cursor - startOffsetMs) / 1000),
  };
}

async function callLLM(topicQuery: string, durationSeconds: number, mode: 'generate' | 'extend', priorBeatsRecap?: string): Promise<ImagineLLMResponse> {
  const raw = await aiChat({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(topicQuery, durationSeconds, mode, priorBeatsRecap) },
    ],
    temperature: 0.7,
    maxTokens: 4000,
    jsonMode: true,
  });
  const parsed = tryParseLLM(raw);
  if (!parsed || parsed.beats.length === 0) {
    throw new Error('processImagineJob: LLM did not return a valid beats array');
  }
  return parsed;
}

function summariseBeatsForExtend(segments: VoiceoverSegment[]): string {
  return segments
    .map((s, i) => `Beat ${i + 1} (${s.startMs}ms-${s.endMs}ms, ${s.voice}): ${s.text}`)
    .join('\n');
}

export async function processImagineJob(job: Job, taskId: string): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const data = (job.data || {}) as ImagineVideoJobPayload;
  const { topicQuery, userId } = data;
  const requested = clampDuration(Number(data.durationSeconds || 60));

  if (!topicQuery || !userId) {
    throw new Error('processImagineJob: topicQuery and userId required');
  }

  if (data.extendVideoId) {
    const { data: existing, error: exErr } = await sb
      .from('imagine_videos')
      .select('id, user_id, topic_query, duration_seconds, voiceover_segments, scene_specs, syllabus_tag')
      .eq('id', data.extendVideoId)
      .maybeSingle();
    if (exErr || !existing) {
      throw new Error(`processImagineJob: extend target ${data.extendVideoId} not found`);
    }

    const priorSegments: VoiceoverSegment[] = Array.isArray(existing.voiceover_segments) ? existing.voiceover_segments as VoiceoverSegment[] : [];
    const priorScenes: SceneSpec[] = Array.isArray(existing.scene_specs) ? existing.scene_specs as SceneSpec[] : [];
    const lastEndMs = priorSegments.length > 0 ? Number(priorSegments[priorSegments.length - 1].endMs) || 0 : 0;
    const recap = summariseBeatsForExtend(priorSegments);
    const extendSeconds = clampDuration(Number(data.durationSeconds || 30));

    const llm = await callLLM(existing.topic_query as string, extendSeconds, 'extend', recap);
    const { voiceoverSegments: newSegments, sceneSpecs: newScenes, totalSeconds } = normaliseBeats(llm.beats, lastEndMs, existing.topic_query as string);

    const merged = {
      voiceover_segments: [...priorSegments, ...newSegments],
      scene_specs: [...priorScenes, ...newScenes],
      duration_seconds: clampDuration(Number(existing.duration_seconds || 0) + totalSeconds),
      generated_by: 'imagine-engine-v1',
      render_status: 'r3f_only' as const,
    };

    const { error: updErr } = await sb
      .from('imagine_videos')
      .update(merged)
      .eq('id', existing.id);
    if (updErr) throw new Error(`processImagineJob: extend update failed: ${updErr.message}`);

    return {
      taskId,
      videoId: existing.id,
      mode: 'extend',
      addedBeats: newSegments.length,
      totalBeats: merged.voiceover_segments.length,
      totalDurationSeconds: merged.duration_seconds,
    };
  }

  // Generate mode — payload.videoId is the pre-inserted empty row.
  if (!data.videoId) {
    throw new Error('processImagineJob: videoId required (API must pre-insert the row)');
  }

  const llm = await callLLM(topicQuery, requested, 'generate');
  const { voiceoverSegments, sceneSpecs, totalSeconds } = normaliseBeats(llm.beats, 0, topicQuery);

  // Enforce ±2s tolerance — if the LLM drifted, clamp by truncating or padding
  // the final beat so the row's duration_seconds matches what we persist.
  let finalDuration = totalSeconds;
  if (Math.abs(totalSeconds - requested) > 2 && voiceoverSegments.length > 0) {
    const last = voiceoverSegments[voiceoverSegments.length - 1];
    const targetMs = requested * 1000;
    const otherEnd = last.startMs;
    const newEnd = Math.max(otherEnd + BEAT_MIN_SECONDS * 1000, targetMs);
    last.endMs = newEnd;
    sceneSpecs[sceneSpecs.length - 1] = {
      ...sceneSpecs[sceneSpecs.length - 1],
      durationSeconds: (newEnd - last.startMs) / 1000,
    };
    finalDuration = Math.round(newEnd / 1000);
  }

  finalDuration = clampDuration(finalDuration);
  const syllabusTag = (typeof llm.syllabusTag === 'string' && llm.syllabusTag.trim().length > 0)
    ? llm.syllabusTag.trim().slice(0, 64)
    : 'general.exploration';

  const { error: updErr } = await sb
    .from('imagine_videos')
    .update({
      voiceover_segments: voiceoverSegments,
      scene_specs: sceneSpecs,
      syllabus_tag: syllabusTag,
      duration_seconds: finalDuration,
      generated_by: 'imagine-engine-v1',
      render_status: 'r3f_only',
    })
    .eq('id', data.videoId);

  if (updErr) {
    throw new Error(`processImagineJob: generate update failed: ${updErr.message}`);
  }

  return {
    taskId,
    videoId: data.videoId,
    mode: 'generate',
    syllabusTag,
    beats: voiceoverSegments.length,
    durationSeconds: finalDuration,
  };
}
