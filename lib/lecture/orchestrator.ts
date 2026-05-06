// Sprint 9-A — programmatic wrapper around the canonical orchestrator script
// (scripts/verification/mvp-e2e-lecture.ts). The script remains the
// source-of-truth pipeline; this module spawns it as a child process and
// reports stage progress by tailing stdout.
//
// Why child_process and not import-as-module: the script's IIFE has process.exit
// at the end and module-scope side effects (env reads, supabase client). Forking
// it preserves the working pipeline byte-for-byte (CHECKPOINT rule "DO NOT
// REWRITE WORKING PIPELINE") while letting the processor stream progress.
//
// This wrapper extends the script with topic-aware overrides via env vars when
// the topic is something other than 'ohms-law'. Day-2: the script will accept
// CLI args for arbitrary topics; for the MVP slice the only canonical topic
// remains Ohm's Law.

import { spawn } from 'child_process';
import { existsSync, mkdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { LectureStage } from '../queue/types';

export interface GenerateLectureOpts {
  topic: string;                              // canonical slug or free-text title
  durationSeconds?: number;                   // best-effort hint
  style?: 'classroom' | 'concept-short';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: 'en' | 'hi' | 'hinglish';
  outputDir?: string;                         // absolute, defaults to <repo>/outputs/mvp
  fresh?: boolean;
  skipLtx?: boolean;
  // Sprint 9-B: when provided, the orchestrator script loads this LECTURE_PLAN
  // instead of its hardcoded Ohm's Law plan. Shape must match the LecturePlan
  // interface inside scripts/verification/mvp-e2e-lecture.ts.
  planJson?: unknown;
  // Sprint 9-C slice-2 — opt-in Remotion parallel render. When true, the
  // child script also runs STAGE 9 (Remotion) and emits lecture-remotion.mp4
  // alongside lecture.mp4. ffmpeg path stays canonical regardless.
  useRemotion?: boolean;
  onStageProgress?: (e: StageProgressEvent) => void | Promise<void>;
}

export interface StageProgressEvent {
  stage: LectureStage;
  rawStageName: string;     // verbatim from script banner
  status: 'started' | 'completed' | 'cached' | 'failed';
  elapsedMs?: number;
}

export interface GenerateLectureResult {
  outputDir: string;
  durationSeconds: number;
  wallSeconds: number;
  artifacts: {
    lectureMp4: string;
    // Sprint 9-C slice-2 — present when useRemotion=true.
    lectureRemotionMp4?: string;
    narrationMp3: string;
    subtitlesSrt: string;
    notesJson: string;
    notesPdf: string;
    quizJson: string;
    timelineJson: string;
    metadataJson: string;
    boardOverlayMp4: string;
  };
  metadata: any;             // contents of metadata.json
  // Convenience surfacing of metadata.renderers.remotion when present.
  remotionMetrics?: {
    render_time_ms: number;
    frames_rendered: number;
    fps: number;
    composition: string;
  };
}

// Maps the script's "STAGE: N <name>" banner to our public LectureStage enum.
function mapStageName(rawStageName: string): LectureStage | null {
  const s = rawStageName.toLowerCase();
  if (s.includes('plan') || s.includes('shots')) return 'shot-planning';
  if (s.includes('ltx')) return 'ltx-render';
  if (s.includes('board')) return 'manim-render';
  if (s.includes('narration')) return 'narration';
  if (s.includes('normalize') || s.includes('concat')) return 'composition';
  if (s.includes('mux') || s.includes('subtitles')) return 'subtitles';
  if (s.includes('notes')) return 'notes';
  if (s.includes('quiz')) return 'quiz';
  if (s.includes('timeline') || s.includes('metadata')) return 'finalizing';
  return null;
}

const ROOT = process.cwd();

export async function generateLecture(opts: GenerateLectureOpts): Promise<GenerateLectureResult> {
  // Sprint 9-B: arbitrary topics are now supported when planJson is provided.
  // For the bare 'ohms-law' shorthand we still allow the no-plan path so
  // Sprint 9-A's deterministic flow keeps working.
  const usingDefaultPlan = opts.topic === 'ohms-law' || opts.topic === "Ohm's Law";
  if (!usingDefaultPlan && !opts.planJson) {
    throw new Error(
      `generateLecture: topic '${opts.topic}' requires planJson. ` +
      `The bare default plan only supports 'ohms-law'/"Ohm's Law".`
    );
  }

  const outputDir = opts.outputDir || path.join(ROOT, 'outputs', 'mvp');
  const scriptPath = path.join(ROOT, 'scripts', 'verification', 'mvp-e2e-lecture.ts');
  if (!existsSync(scriptPath)) {
    throw new Error(`orchestrator script missing at ${scriptPath}`);
  }

  // Spawn `node node_modules/tsx/dist/cli.mjs <script> ...args` directly.
  // We avoid `npx` / `shell: true` because:
  //   - npx is a .cmd shim on Windows → spawn EINVAL without shell
  //   - shell:true argv parsing breaks on cwd paths containing spaces
  //     (e.g. "C:\Users\...\New folder\..." → resolves to ".\New" + " folder")
  // The worker already inherits .env.local via `tsx --env-file=.env.local` in
  // package.json `worker:hermes`, so the orchestrator child inherits the same
  // env via process.env without dotenv-cli.
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!existsSync(tsxCli)) {
    throw new Error(`tsx CLI missing at ${tsxCli}`);
  }
  const childArgs = [tsxCli, scriptPath];
  if (opts.fresh) childArgs.push('--fresh');
  if (opts.skipLtx) childArgs.push('--skip-ltx');
  if (opts.useRemotion) childArgs.push('--remotion');

  // Sprint 9-B — write planJson to a temp file and forward via env. Inline
  // JSON would race the OS env-var size limit on Windows for large plans.
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  let planTmpPath: string | null = null;
  if (opts.planJson) {
    mkdirSync(outputDir, { recursive: true });
    planTmpPath = path.join(tmpdir(), `lecture-plan-${Date.now()}-${process.pid}.json`);
    writeFileSync(planTmpPath, JSON.stringify(opts.planJson, null, 2), 'utf8');
    childEnv.PLAN_JSON = planTmpPath;
  }
  if (opts.outputDir) {
    childEnv.LECTURE_OUT_DIR = outputDir;
  }

  // Derive the narration topic slug for the post-run artifact paths. The script
  // names narration files `${TOPIC_SLUG}-narration.{mp3,srt}`.
  let narrationSlug = 'ohms-law';
  if (opts.planJson && typeof (opts.planJson as any)?.topic === 'string') {
    narrationSlug = (opts.planJson as any).topic;
  }

  const t0 = Date.now();
  const stagesEmitted = new Set<string>();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, childArgs, {
      cwd: ROOT,
      env: childEnv,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buf = '';
    const handleLine = async (line: string) => {
      // Banner: "  STAGE: 3 LTX cinematic shots"
      const m = /STAGE:\s+(.+)/.exec(line);
      if (m) {
        const raw = m[1].trim();
        const stage = mapStageName(raw);
        if (stage && opts.onStageProgress && !stagesEmitted.has(stage + ':started')) {
          stagesEmitted.add(stage + ':started');
          await opts.onStageProgress({ stage, rawStageName: raw, status: 'started' });
        }
        return;
      }
      // Completion: "  ✔ <stage> done in 1234 ms"
      const c = /✔\s+(.+?)\s+done\s+in\s+(\d+)\s*ms/.exec(line);
      if (c && opts.onStageProgress) {
        const raw = c[1].trim();
        const ms = parseInt(c[2], 10);
        const stage = mapStageName(raw);
        if (stage) {
          await opts.onStageProgress({ stage, rawStageName: raw, status: 'completed', elapsedMs: ms });
        }
      }
      // Cached: "     CACHED ..." appearing inside a stage we already mapped.
      // No-op — the completion line still fires after caching.
    };

    child.stdout.on('data', (d: Buffer) => {
      buf += d.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() || '';
      for (const line of lines) {
        process.stdout.write(line + '\n');
        handleLine(line).catch(() => {/* progress is best-effort */});
      }
    });
    child.stderr.on('data', (d: Buffer) => {
      process.stderr.write(d.toString());
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mvp-e2e-lecture.ts exited ${code}`));
    });
  });

  const wallSeconds = Math.round((Date.now() - t0) / 1000);

  const artifacts: GenerateLectureResult['artifacts'] = {
    lectureMp4:        path.join(outputDir, 'lecture.mp4'),
    narrationMp3:      path.join(outputDir, 'intermediate', `${narrationSlug}-narration.mp3`),
    subtitlesSrt:      path.join(outputDir, 'intermediate', `${narrationSlug}-narration.srt`),
    notesJson:         path.join(outputDir, 'mvp-notes.json'),
    notesPdf:          path.join(outputDir, 'mvp-notes.pdf'),
    quizJson:          path.join(outputDir, 'mvp-quiz.json'),
    timelineJson:      path.join(outputDir, 'timeline.json'),
    metadataJson:      path.join(outputDir, 'metadata.json'),
    boardOverlayMp4:   path.join(outputDir, 'intermediate', 'board-overlay.mp4'),
  };

  if (planTmpPath) {
    try { require('fs').unlinkSync(planTmpPath); } catch { /* best-effort */ }
  }

  for (const [k, p] of Object.entries(artifacts)) {
    if (!p) continue;
    if (!existsSync(p)) throw new Error(`orchestrator missing artifact ${k} at ${p}`);
    if (statSync(p).size < 100) throw new Error(`orchestrator artifact ${k} too small at ${p}`);
  }

  // Sprint 9-C slice-2 — pick up the optional Remotion artifact + metrics.
  if (opts.useRemotion) {
    const remotionPath = path.join(outputDir, 'lecture-remotion.mp4');
    if (!existsSync(remotionPath)) {
      throw new Error(`orchestrator: --remotion was set but ${remotionPath} is missing`);
    }
    if (statSync(remotionPath).size < 100 * 1024) {
      throw new Error(`orchestrator: lecture-remotion.mp4 too small (<100 KB) at ${remotionPath}`);
    }
    artifacts.lectureRemotionMp4 = remotionPath;
  }

  const metadata = JSON.parse(readFileSync(artifacts.metadataJson, 'utf8'));
  const durationSeconds: number = metadata?.video?.duration || 0;
  const remotionMetrics = metadata?.renderers?.remotion
    ? {
        render_time_ms: metadata.renderers.remotion.render_time_ms,
        frames_rendered: metadata.renderers.remotion.frames_rendered,
        fps: metadata.renderers.remotion.fps,
        composition: metadata.renderers.remotion.composition || 'EducationalLecture',
      }
    : undefined;

  return { outputDir, durationSeconds, wallSeconds, artifacts, metadata, remotionMetrics };
}
