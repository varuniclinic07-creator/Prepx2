// Concept Shorts processor (Sprint 4-1).
// LLM generates a 120-second concept explanation + SceneSpec JSON,
// validated via parseSceneSpec, inserted into concept_shorts with
// render_status='r3f_only' for the R3F client renderer.

import type { Job } from 'bullmq';
import { getAdminClient } from '../supabase-admin';
import { aiChat } from '../ai-router';
import { parseSceneSpec, type SceneSpec } from '../3d/scene-spec';
import type { ShortsJobPayload } from '../queue/types';

const SYSTEM_PROMPT = `You are the PrepX Concept Shorts Writer. You create 120-second micro-lectures for UPSC CSE aspirants. For every request, output STRICT JSON with these fields:

{
  "title": "Short, catchy title (max 8 words)",
  "voiceover_text": "120-second narration text (~290 words). 10th-class reading level. Bilingual if helpful.",
  "style": "concept_explainer | pyq_breaker | mnemonic_visual | diagram_tour",
  "scene_spec": {
    "version": 1,
    "background": "primary",
    "durationSeconds": 120,
    "meshes": [
      {"kind":"sphere","position":[0,0,0],"color":"cyan","emissive":true,"label":"Main Concept"},
      {"kind":"torus","position":[1,0.5,0],"color":"saffron","label":"Detail 1"},
      {"kind":"box","position":[-1,-0.3,0],"color":"success","label":"Detail 2"}
    ],
    "cameraKeyframes": [
      {"timeSeconds":0,"position":[0,0.5,5],"lookAt":[0,0,0]},
      {"timeSeconds":40,"position":[0,1,4],"lookAt":[0,0,0]},
      {"timeSeconds":80,"position":[1.5,0.8,3.5],"lookAt":[0,0,0]},
      {"timeSeconds":120,"position":[2,0.5,3],"lookAt":[0,0,0]}
    ],
    "labels": [
      {"timeSeconds":5,"position":[0,1,0],"text":"Key Term","durationSeconds":10}
    ],
    "ambientIntensity": 0.6
  }
}

SceneSpec rules:
- version MUST be 1
- background: "primary" | "cyan" | "saffron" | "success" | "warning" | "muted" | "magenta" | "gold"
- meshes: use "sphere","box","torus","cone","plane","icosahedron" — position is [x,y,z]
- cameraKeyframes: at least start and end keyframes, timeSeconds must span the full duration
- labels: floating text at specific times with position [x,y,z]
- ambientIntensity: 0.4-1.0

Make every short engaging, visual-first, and ruthlessly simplified. No jargon without explanation.`;

interface ShortOutput {
  title: string;
  voiceover_text: string;
  style: 'concept_explainer' | 'pyq_breaker' | 'mnemonic_visual' | 'diagram_tour';
  scene_spec: SceneSpec;
}

async function callLLM(prompt: string): Promise<ShortOutput> {
  const res = await aiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    jsonMode: true,
  });

  // Parse — handle raw text that may have markdown fences
  let text = (res || '').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  }

  let parsed: any;
  try { parsed = JSON.parse(text); } catch {
    throw new Error(`Shorts LLM returned unparseable JSON: ${text.slice(0, 200)}`);
  }

  if (!parsed.title || !parsed.scene_spec) {
    throw new Error('Shorts LLM output missing title or scene_spec');
  }

  const scene = parseSceneSpec(parsed.scene_spec);
  if (!scene) {
    throw new Error('Shorts LLM scene_spec failed parseSceneSpec validation');
  }

  return {
    title: parsed.title,
    voiceover_text: parsed.voiceover_text || '',
    style: parsed.style || 'concept_explainer',
    scene_spec: scene,
  };
}

export async function processShortsJob(job: Job, taskId: string): Promise<Record<string, any>> {
  const sb = getAdminClient();
  const data = job.data as ShortsJobPayload & { shortId?: string };
  const { topicId, conceptTag, durationSeconds = 120 } = data;

  if (!topicId) throw new Error('processShortsJob: topicId required');

  // Fetch topic
  const { data: topic } = await sb.from('topics')
    .select('id, title, subject, syllabus_tag, content')
    .eq('id', topicId).maybeSingle();
  if (!topic) throw new Error(`processShortsJob: topic ${topicId} not found`);

  const topicSnippet = typeof topic.content === 'string'
    ? topic.content.slice(0, 2000)
    : (topic.content ? JSON.stringify(topic.content).slice(0, 2000) : topic.title);

  const prompt = [
    `Topic: ${topic.title}`,
    `Subject: ${topic.subject || 'General'}`,
    `Concept: ${conceptTag}`,
    `Duration: ${durationSeconds}s`,
    `Content: ${topicSnippet}`,
    `Style: concept_explainer`,
  ].join('\n');

  // Generate with retry
  let output: ShortOutput;
  try {
    output = await callLLM(prompt);
  } catch {
    // Single retry
    output = await callLLM(prompt);
  }

  // Insert
  const insertPayload: Record<string, any> = {
    topic_id: topicId,
    user_id: job.data?.userId || null,
    concept_tag: conceptTag,
    title: output.title,
    style: output.style,
    scene_spec: output.scene_spec,
    render_status: 'r3f_only',
    approval_status: 'pending',
    duration_seconds: durationSeconds,
    voiceover_text: output.voiceover_text,
    generated_by: 'shorts-agent',
  };

  // If shortId was pre-inserted by API, update; otherwise insert fresh
  let shortId: string;
  if (data.shortId) {
    const { error: updErr } = await sb.from('concept_shorts')
      .update(insertPayload).eq('id', data.shortId);
    if (updErr) throw new Error(`processShortsJob: update failed: ${updErr.message}`);
    shortId = data.shortId;
  } else {
    const { data: row, error: insErr } = await sb.from('concept_shorts')
      .insert(insertPayload).select('id').single();
    if (insErr || !row) throw new Error(`processShortsJob: insert failed: ${insErr?.message}`);
    shortId = row.id;
  }

  return { taskId, shortId, topicId, conceptTag, style: output.style, durationSeconds };
}
