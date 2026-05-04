// Decomposes a script's markers into typed shots that the multi-shot renderer
// can dispatch in parallel. Heuristic kind selection — equations/formulae/graphs
// route to Manim, short static overlays to a Remotion title card, everything
// else to ComfyUI.

import type { ScriptMarker } from '../agents/script-writer';

export type ShotKind = 'title' | 'manim' | 'comfy' | 'narration';

export interface DecomposedShot {
  position: number;
  kind: ShotKind;
  start_seconds: number;
  duration_seconds: number;
  visual_cue: string;
  narration_chunk: string;
  prompt: string;
}

const MANIM_KEYWORDS = [
  'equation', 'formula', 'graph', 'chart', 'plot', 'derivation', 'integral',
  'differential', 'function', 'theorem', 'proof', 'matrix', 'vector field',
  'distribution', 'curve', 'axes',
];

const TITLE_KEYWORDS = [
  'title card', 'caption', 'overlay text', 'heading', 'section title',
  'definition box', 'quote card', 'fact card',
];

function classify(visualCue: string): ShotKind {
  const cue = (visualCue || '').toLowerCase();
  if (!cue.trim()) return 'narration';
  for (const kw of MANIM_KEYWORDS) if (cue.includes(kw)) return 'manim';
  for (const kw of TITLE_KEYWORDS) if (cue.includes(kw)) return 'title';
  // Very short cues (< 6 words) are usually a textual beat, not a visual scene.
  if (cue.split(/\s+/).filter(Boolean).length < 6) return 'title';
  return 'comfy';
}

function buildPrompt(kind: ShotKind, cue: string, narration: string): string {
  const cueClean = (cue || '').trim();
  const nClean = (narration || '').slice(0, 280);
  switch (kind) {
    case 'comfy':
      return `${cueClean}. UPSC classroom lecture, photoreal, cinematic lighting, 4k.`;
    case 'manim':
      return `Manim scene: ${cueClean || nClean}. White-on-dark, smooth tween, no extraneous text.`;
    case 'title':
      return cueClean || nClean.split('.').slice(0, 1).join('. ');
    case 'narration':
      return nClean;
  }
}

export function decomposeMarkers(
  markers: ScriptMarker[] | null | undefined,
  fallback: { title: string; durationSeconds: number },
): DecomposedShot[] {
  const safe = Array.isArray(markers) ? markers : [];
  if (safe.length === 0) {
    // No markers — emit a single title shot for the whole duration so the
    // renderer at least produces a card. This keeps the failure mode visible
    // (one weak shot) rather than invisible (zero shots, lecture stuck).
    return [{
      position: 0,
      kind: 'title',
      start_seconds: 0,
      duration_seconds: Math.max(1, fallback.durationSeconds || 30),
      visual_cue: fallback.title,
      narration_chunk: '',
      prompt: fallback.title,
    }];
  }

  const sorted = [...safe].sort(
    (a, b) => (a.time_seconds ?? 0) - (b.time_seconds ?? 0),
  );

  return sorted.map((m, i) => {
    const cue = (m.visual_cue || '').trim();
    const narration = (m.narration_chunk || '').trim();
    const kind = classify(cue);
    const start = Math.max(0, Math.floor(m.time_seconds ?? 0));
    const dur = Math.max(1, Math.floor(m.duration_seconds ?? 5));
    return {
      position: i,
      kind,
      start_seconds: start,
      duration_seconds: dur,
      visual_cue: cue,
      narration_chunk: narration,
      prompt: buildPrompt(kind, cue, narration),
    };
  });
}
