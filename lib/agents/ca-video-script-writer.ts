import { aiChat } from '../ai-router';
import type { SceneSpec } from '../3d/scene-spec';

// CA Video Newspaper script writer — Sprint 4-2.
// Takes a published daily bundle and generates a 5-8 minute video newspaper
// script with SceneSpec beats for the React Three Fiber renderer.

interface BundleInput {
  bundleDate: string;
  theme: string;
  subtitle: string | null;
  summary: string;
  articles: Array<{
    title: string;
    source: string;
    summary: string | null;
    keyPoints: string[];
    relevance: string;
  }>;
}

interface ScriptBeat {
  startMs: number;
  endMs: number;
  voiceover: { text: string; voice: 'male_in' | 'female_in' };
  scene: SceneSpec;
  segmentType: 'intro' | 'headline' | 'deep_dive' | 'wrap_up';
}

export interface CaVideoScript {
  title: string;
  theme: string;
  scriptText: string;
  beats: ScriptBeat[];
  durationSeconds: number;
  generatedBy: string;
}

const SYSTEM_PROMPT = [
  'You are PrepX CA Video Newspaper — a 5-8 minute daily current affairs bulletin for UPSC CSE aspirants.',
  'You receive a published daily news bundle and produce a JSON-only beat list that drives a React Three Fiber scene renderer.',
  'Hard rules:',
  ' - Plain easy English. Flesch-Kincaid grade ≤ 10. Each voiceover line ≤ 30 words.',
  ' - Structure: 1 intro beat (30-45s) → 3-5 headline beats (45-90s each) → 1 wrap-up beat (20-30s).',
  ' - Every beat MUST include a SceneSpec with 3-7 meshes, 2-3 camera keyframes, and 1-3 floating labels containing key terms.',
  ' - Style: news-anchor desk for intro/wrap-up, 3d-animated infographics for headlines.',
  ' - Beats are contiguous (no gaps, no overlap). Sum must equal total duration ±2 seconds.',
  ' - Voice alternates per beat (male_in / female_in). First beat is male_in.',
  ' - Each headline beat covers 1-2 related articles. Deep dive the most UPSC-relevant ones.',
  ' - Output JSON ONLY. No prose, no markdown fences.',
].join('\n');

function buildUserPrompt(input: BundleInput): string {
  const articleList = input.articles
    .map((a, i) => `${i + 1}. [${a.relevance}] ${a.title} (${a.source})${a.summary ? ` — ${a.summary.slice(0, 200)}` : ''}${a.keyPoints.length > 0 ? `\n   Key: ${a.keyPoints.slice(0, 3).join('; ')}` : ''}`)
    .join('\n\n');

  const sceneSpecExample = {
    version: 1,
    background: 'primary',
    durationSeconds: 60,
    meshes: [
      { kind: 'box', position: [0, 0.5, 0], scale: [3, 2, 0.2], color: 'primary', label: 'HEADLINE' },
      { kind: 'sphere', position: [-1.5, 1, 1], scale: 0.3, color: 'saffron', emissive: true },
      { kind: 'torus', position: [1.5, -0.2, 1], scale: 0.5, color: 'cyan' },
    ],
    cameraKeyframes: [
      { timeSeconds: 0, position: [0, 1.5, 6], lookAt: [0, 0.5, 0] },
      { timeSeconds: 60, position: [3, 2, 5], lookAt: [0, 0.5, 0] },
    ],
    labels: [
      { timeSeconds: 1, position: [0, 2.2, 0], text: 'Breaking News', durationSeconds: 58, size: 0.5 },
    ],
    ambientIntensity: 0.6,
    voiceover: { text: 'Today\'s top story...', voice: 'male_in' },
  };

  return [
    `Generate a video newspaper script for ${input.bundleDate}.`,
    '',
    `Theme: ${input.theme}${input.subtitle ? ` — ${input.subtitle}` : ''}`,
    `Bundle summary: ${input.summary}`,
    '',
    `Articles (${input.articles.length} total):`,
    articleList,
    '',
    'Target: 5-8 minutes (300-480 seconds). Pick the most UPSC-relevant stories.',
    '',
    'Example SceneSpec for one beat:',
    JSON.stringify(sceneSpecExample, null, 2),
    '',
    'Required response shape (JSON only):',
    JSON.stringify({
      title: 'Daily CA Video Newspaper — March 15, 2026',
      theme: 'Geopolitics & Governance',
      beats: [{
        startMs: 0,
        endMs: 40000,
        voiceover: { text: 'Welcome to your daily UPSC current affairs briefing...', voice: 'male_in' },
        scene: sceneSpecExample,
        segmentType: 'intro',
      }],
    }, null, 2),
  ].join('\n');
}

function tryParse(raw: string): { title: string; theme: string; beats: any[] } | null {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    const obj = JSON.parse(trimmed);
    if (!obj || !Array.isArray(obj.beats) || obj.beats.length === 0) return null;
    return obj;
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      const obj = JSON.parse(m[0]);
      if (!Array.isArray(obj.beats) || obj.beats.length === 0) return null;
      return obj;
    } catch {
      return null;
    }
  }
}

function normaliseBeats(rawBeats: any[]): ScriptBeat[] {
  const beats: ScriptBeat[] = [];
  let cursor = 0;
  for (let i = 0; i < rawBeats.length; i++) {
    const b = rawBeats[i];
    const startMs = Number.isFinite(b?.startMs) ? Number(b.startMs) : cursor;
    const endMs = Number.isFinite(b?.endMs) ? Number(b.endMs) : startMs + 60000;
    let span = endMs - startMs;
    if (span <= 0) span = 60000;
    span = Math.max(20000, Math.min(90000, Math.round(span)));

    const voice = b?.voiceover?.voice === 'female_in' ? 'female_in' : (i % 2 === 0 ? 'male_in' : 'female_in');
    const text = (b?.voiceover?.text || '').trim().slice(0, 300);

    beats.push({
      startMs: cursor,
      endMs: cursor + span,
      voiceover: { text, voice },
      scene: b?.scene || {},
      segmentType: b?.segmentType || 'headline',
    });
    cursor += span;
  }
  return beats;
}

export async function generateCaVideoScript(input: BundleInput): Promise<CaVideoScript> {
  const raw = await aiChat({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
    temperature: 0.7,
    maxTokens: 6000,
    jsonMode: true,
  });

  const parsed = tryParse(raw);
  if (!parsed) {
    throw new Error('CA Video script writer: LLM did not return valid beats');
  }

  const beats = normaliseBeats(parsed.beats);
  const totalMs = beats.length > 0 ? beats[beats.length - 1].endMs : 300000;
  const durationSeconds = Math.round(totalMs / 1000);
  const clamped = Math.max(300, Math.min(480, durationSeconds));

  const fullScript = beats
    .map((b, i) => `[${b.segmentType.toUpperCase()}] ${Math.floor(b.startMs / 1000)}s-${Math.floor(b.endMs / 1000)}s\n${b.voiceover.text}`)
    .join('\n\n');

  return {
    title: parsed.title || `Daily CA Video Newspaper — ${input.bundleDate}`,
    theme: parsed.theme || input.theme,
    scriptText: fullScript,
    beats,
    durationSeconds: clamped,
    generatedBy: 'ca-video-script-writer-v1',
  };
}
