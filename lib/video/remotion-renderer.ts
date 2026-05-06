// Sprint 9-C Phase C — Remotion render driver.
//
// Pure server-side helper. Bundles the remotion/ project, selects the
// EducationalLecture composition, and renders it to MP4. The ffmpeg path
// stays the canonical pipeline; this is the parallel programmable renderer.
//
// Inputs are the same JSON files the ffmpeg path emits:
//   timeline.json, metadata.json, mvp-notes.json, mvp-quiz.json
// plus the optional intermediate/<slug>-narration.srt for subtitles.
//
// The driver keeps Remotion completely isolated from the Next runtime — it
// uses dynamic imports because @remotion/* are CJS+ESM mixed and shouldn't
// be pulled into the Next build graph.

import { promises as fs } from 'fs';
import path from 'path';
import { existsSync } from 'fs';

export interface RenderRemotionOpts {
  fixturesDir: string;          // e.g. outputs/mvp/
  outFile: string;              // absolute path to write lecture-remotion.mp4
  compositionId?: string;       // default 'EducationalLecture'
  // Sprint 9-C smoke convenience: when narration SRT lives at a non-default
  // path, override here. Default: <fixturesDir>/intermediate/<slug>-narration.srt
  subtitlesSrtPath?: string;
}

export interface RenderRemotionResult {
  outFile: string;
  durationFrames: number;
  fps: number;
  width: number;
  height: number;
  bytes: number;
  renderTimeMs: number;
  framesRendered: number;
}

interface MetadataJson {
  topic: { slug: string; title: string; formula?: string };
  narration?: { script?: string; word_count?: number; actual_seconds?: number };
  video?: { duration?: number; width?: number; height?: number };
}

async function readJson<T>(p: string): Promise<T> {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as T;
}

async function readSubtitles(srtPath?: string): Promise<Array<{ startSec: number; endSec: number; text: string }>> {
  if (!srtPath || !existsSync(srtPath)) return [];
  const raw = await fs.readFile(srtPath, 'utf8');
  // Minimal SRT parser inline (mirrors remotion/utils/srt.ts so node-side
  // and renderer-side are in sync without cross-package imports).
  const out: Array<{ startSec: number; endSec: number; text: string }> = [];
  const blocks = raw.replace(/\r\n/g, '\n').split(/\n\n+/);
  const tcToSec = (tc: string): number => {
    const m = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(tc.trim());
    if (!m) return 0;
    return parseInt(m[1], 10) * 3600 + parseInt(m[2], 10) * 60 + parseInt(m[3], 10) + parseInt(m[4], 10) / 1000;
  };
  for (const b of blocks) {
    const lines = b.trim().split('\n');
    if (lines.length < 2) continue;
    const tcLineIdx = lines[0].includes('-->') ? 0 : 1;
    const tcLine = lines[tcLineIdx];
    if (!tcLine || !tcLine.includes('-->')) continue;
    const [a, c] = tcLine.split('-->');
    const text = lines.slice(tcLineIdx + 1).join('\n').trim();
    if (text) out.push({ startSec: tcToSec(a), endSec: tcToSec(c), text });
  }
  return out;
}

export async function renderRemotionLecture(opts: RenderRemotionOpts): Promise<RenderRemotionResult> {
  const { fixturesDir, outFile } = opts;
  const compositionId = opts.compositionId || 'EducationalLecture';

  const timelinePath = path.join(fixturesDir, 'timeline.json');
  const metadataPath = path.join(fixturesDir, 'metadata.json');
  const notesPath    = path.join(fixturesDir, 'mvp-notes.json');
  const quizPath     = path.join(fixturesDir, 'mvp-quiz.json');

  for (const p of [timelinePath, metadataPath, notesPath, quizPath]) {
    if (!existsSync(p)) throw new Error(`renderRemotionLecture: missing fixture ${p}`);
  }

  const [timeline, metadata, notes, quiz] = await Promise.all([
    readJson<any>(timelinePath),
    readJson<MetadataJson>(metadataPath),
    readJson<any>(notesPath),
    readJson<any>(quizPath),
  ]);

  // Default subtitles path: <fixturesDir>/intermediate/<slug>-narration.srt
  const slug = metadata?.topic?.slug || timeline?.topic || 'lecture';
  const defaultSrt = path.join(fixturesDir, 'intermediate', `${slug}-narration.srt`);
  const subtitles = await readSubtitles(opts.subtitlesSrtPath || defaultSrt);

  const inputProps = {
    bundle: {
      timeline,
      metadata,
      notes,
      quiz,
      subtitles,
    },
  };

  // Dynamic import — keeps Remotion packages out of Next build graph.
  const bundler = await import('@remotion/bundler');
  const renderer = await import('@remotion/renderer');

  const remotionRoot = path.join(process.cwd(), 'remotion', 'index.ts');
  if (!existsSync(remotionRoot)) {
    throw new Error(`remotion entry missing at ${remotionRoot}`);
  }

  const t0 = Date.now();

  // 1. Bundle.
  const bundleLocation = await bundler.bundle({
    entryPoint: remotionRoot,
    // Don't try to resolve Next path aliases inside the bundler.
    webpackOverride: (config) => config,
  });

  // 2. Resolve composition with inputProps.
  const comps = await renderer.selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  await fs.mkdir(path.dirname(outFile), { recursive: true });

  // 3. Render to MP4.
  await renderer.renderMedia({
    composition: comps,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outFile,
    inputProps,
    imageFormat: 'jpeg',
    chromiumOptions: { disableWebSecurity: true },
  });

  const stat = await fs.stat(outFile);
  const renderTimeMs = Date.now() - t0;

  return {
    outFile,
    durationFrames: comps.durationInFrames,
    fps: comps.fps,
    width: comps.width,
    height: comps.height,
    bytes: stat.size,
    renderTimeMs,
    framesRendered: comps.durationInFrames,
  };
}
