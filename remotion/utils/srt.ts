// Minimal SRT parser. Used by the subtitle overlay when the renderer is
// passed a subtitles file path; we parse outside the composition (in
// render.ts) and forward the structured cues via inputProps.

export interface SrtCue {
  startSec: number;
  endSec: number;
  text: string;
}

function tcToSec(tc: string): number {
  // 00:00:03,500
  const m = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(tc.trim());
  if (!m) return 0;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  const ms = parseInt(m[4], 10);
  return h * 3600 + mi * 60 + s + ms / 1000;
}

export function parseSrt(raw: string): SrtCue[] {
  const out: SrtCue[] = [];
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n\n+/);
  for (const b of blocks) {
    const lines = b.trim().split('\n');
    if (lines.length < 2) continue;
    // Drop the index line if present.
    const tcLineIdx = lines[0].includes('-->') ? 0 : 1;
    const tcLine = lines[tcLineIdx];
    if (!tcLine || !tcLine.includes('-->')) continue;
    const [a, c] = tcLine.split('-->');
    const startSec = tcToSec(a);
    const endSec = tcToSec(c);
    const text = lines.slice(tcLineIdx + 1).join('\n').trim();
    if (text) out.push({ startSec, endSec, text });
  }
  return out;
}
