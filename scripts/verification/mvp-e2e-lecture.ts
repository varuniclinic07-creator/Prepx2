// MVP-E2E-LECTURE — canonical end-to-end orchestrator for a single educational
// lecture. Topic = Ohm's Law. Output = ONE 30-60 s 1280x720 H.264 MP4 with
// burned subtitles + muxed narration + composited board overlay, plus notes
// JSON+PDF, quiz JSON, timeline.json, metadata.json.
//
// 8 stages, each with explicit boundary, timing log, and asset-existence check.
// Every stage caches its output under outputs/mvp/intermediate so a re-run
// resumes from the last successful stage. Pass --fresh to ignore cache.
//
// Run:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verification/mvp-e2e-lecture.ts
//   # add --fresh to wipe outputs/mvp/intermediate first
//   # add --skip-ltx to bypass live ComfyUI render (uses cached shot if present)
//
// This is the source-of-truth pipeline. Future API/UI layers wrap this.

import { spawn } from 'child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { createClient } from '@supabase/supabase-js';

import { generateLectureNarration, buildSrt } from '../../lib/lecture/narration';
import { generateLectureNotes } from '../../lib/lecture/notes';
import { generateLectureQuiz } from '../../lib/lecture/quiz';
import { aiChat } from '../../lib/ai-router';
import { bakeBoardScene } from '../../lib/video/board-bake';
import * as comfy from '../../lib/comfyui-client';
import { getAuthHeaders } from '../../lib/comfyui-client';
import { buildSceneWorkflow } from '../../lib/video/scene-to-workflow';
import type { SceneSpec } from '../../lib/3d/scene-spec';

// ────────────────────────────────────────────────────────────
// Constants — Ohm's Law canonical lecture
// ────────────────────────────────────────────────────────────

// Sprint 9-A defaults — Ohm's Law canonical lecture. Sprint 9-B (Product B)
// overrides these via PLAN_JSON / OUT_DIR env vars when invoked from the
// concept-generate processor with a parsed-document plan.
let TOPIC_SLUG = 'ohms-law';
let TOPIC_TITLE = "Ohm's Law";
let TARGET_DURATION_S = 35; // narration target — full lecture lands 30-60s
const ROOT = process.cwd();
let OUT_DIR = process.env.LECTURE_OUT_DIR
  ? path.resolve(process.env.LECTURE_OUT_DIR)
  : path.join(ROOT, 'outputs', 'mvp');
let INT_DIR = path.join(OUT_DIR, 'intermediate');

// LTX cinematic shot ceiling per Sprint 8-A (RTX 5060 Ti, 16 GB VRAM).
const LTX_W = 640;
const LTX_H = 384;
const LTX_DURATION_S = 3;

// Final compose target.
const FINAL_W = 1280;
const FINAL_H = 720;
const FINAL_FPS = 24;

// ────────────────────────────────────────────────────────────
// Lecture structure (Stage 1+2 — deterministic plan, NOT LLM-generated)
// ────────────────────────────────────────────────────────────

interface ShotPlan {
  position: number;
  kind: 'comfy' | 'board';
  start: number;
  end: number;
  scene_prompt?: string;
  board_phase?: string;
  description: string;
}

interface LecturePlan {
  topic: string;
  title: string;
  formula: string;
  formula_unicode: string;
  labels: Array<{ sym: string; meaning: string }>;
  shots: ShotPlan[];
}

const DEFAULT_LECTURE_PLAN: LecturePlan = {
  topic: TOPIC_SLUG,
  title: TOPIC_TITLE,
  formula: 'V = I x R',
  formula_unicode: 'V = I × R',
  labels: [
    { sym: 'V', meaning: 'Voltage (Volts)' },
    { sym: 'I', meaning: 'Current (Amperes)' },
    { sym: 'R', meaning: 'Resistance (Ohms)' },
  ],
  // Linear timeline: [intro 0-3] -> [board 3-30] -> [outro 30-33]
  shots: [
    {
      position: 0,
      kind: 'comfy',
      start: 0,
      end: 3,
      scene_prompt:
        'wide cinematic shot of a teacher in front of a green chalkboard, daylight from a side window, classroom interior, photorealistic, 35mm lens',
      description: 'intro-classroom-shot',
    },
    {
      position: 1,
      kind: 'board',
      start: 3,
      end: 33,
      board_phase: 'full-5-beat',
      description: 'board-write-on-recap',
    },
    {
      position: 2,
      kind: 'comfy',
      start: 33,
      end: 36,
      scene_prompt:
        'closer cinematic shot of a teacher smiling and gesturing thank you, classroom, warm soft light, photorealistic',
      description: 'outro-classroom-shot',
    },
  ],
};

// Sprint 9-B: when PLAN_JSON env var is set (path to a JSON file OR raw JSON
// string), parse it into LECTURE_PLAN and propagate topic/title/duration. The
// schema must match LecturePlan above. Any deviation → throw early.
function loadLecturePlan(): LecturePlan {
  const src = process.env.PLAN_JSON;
  if (!src) return DEFAULT_LECTURE_PLAN;
  let raw: string;
  if (existsSync(src)) {
    raw = readFileSync(src, 'utf8');
  } else if (src.trim().startsWith('{')) {
    raw = src;
  } else {
    throw new Error(`PLAN_JSON is neither a path nor inline JSON: ${src.slice(0, 80)}`);
  }
  let plan: LecturePlan;
  try {
    plan = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`PLAN_JSON parse failed: ${e?.message || e}`);
  }
  // Minimum schema validation.
  if (!plan.topic || !plan.title || !Array.isArray(plan.shots) || plan.shots.length === 0) {
    throw new Error('PLAN_JSON missing required fields (topic, title, shots[])');
  }
  for (const s of plan.shots) {
    if (typeof s.start !== 'number' || typeof s.end !== 'number' || s.end <= s.start) {
      throw new Error(`PLAN_JSON shot has invalid start/end: ${JSON.stringify(s)}`);
    }
    if (s.kind !== 'comfy' && s.kind !== 'board') {
      throw new Error(`PLAN_JSON shot has invalid kind: ${s.kind}`);
    }
  }
  return plan;
}

const LECTURE_PLAN: LecturePlan = loadLecturePlan();
// Re-derive top-level constants from the loaded plan so downstream stages pick
// up the override (narration topic, output filenames, metadata.topic, …).
TOPIC_SLUG = LECTURE_PLAN.topic;
TOPIC_TITLE = LECTURE_PLAN.title;
{
  const lastShot = LECTURE_PLAN.shots[LECTURE_PLAN.shots.length - 1];
  TARGET_DURATION_S = Math.round(lastShot.end);
}

// ────────────────────────────────────────────────────────────
// CLI flags
// ────────────────────────────────────────────────────────────

const FLAGS = new Set(process.argv.slice(2));
const FRESH = FLAGS.has('--fresh');
const SKIP_LTX = FLAGS.has('--skip-ltx');
// Sprint 9-C slice-2 — opt-in parallel Remotion render. Triggers an
// additional STAGE 9 after the canonical ffmpeg pipeline completes; emits
// lecture-remotion.mp4 alongside lecture.mp4 and adds a renderers block to
// metadata.json. ffmpeg path stays default + production fallback.
const USE_REMOTION = FLAGS.has('--remotion') || process.env.LECTURE_USE_REMOTION === '1';

// ────────────────────────────────────────────────────────────
// Tiny logging + stage harness
// ────────────────────────────────────────────────────────────

const stageTimings: Record<string, number> = {};
const stageStatus: Record<string, 'ok' | 'cached' | 'skipped' | 'failed'> = {};

function banner(s: string) {
  console.log(`\n=========================================================`);
  console.log(`  ${s}`);
  console.log(`=========================================================`);
}

async function runStage<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  banner(`STAGE: ${name}`);
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    stageTimings[name] = ms;
    if (stageStatus[name] === undefined) stageStatus[name] = 'ok';
    console.log(`  ✔ ${name} done in ${ms} ms`);
    return result;
  } catch (e: any) {
    stageStatus[name] = 'failed';
    console.error(`  ✘ ${name} FAILED:`, e?.message || e);
    throw e;
  }
}

function assertExists(p: string, label: string) {
  if (!existsSync(p)) throw new Error(`${label} missing at ${p}`);
  const s = statSync(p);
  if (s.size < 100) throw new Error(`${label} too small (${s.size} bytes) at ${p}`);
  console.log(`     ${label}: ${p} (${(s.size / 1024).toFixed(1)} KB)`);
}

// ────────────────────────────────────────────────────────────
// ffmpeg / ffprobe helpers
// ────────────────────────────────────────────────────────────

function runCmd(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stdout = '', stderr = '';
    p.stdout.on('data', d => { stdout += d.toString(); });
    p.stderr.on('data', d => { stderr += d.toString(); });
    p.on('error', reject);
    p.on('close', code => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exit ${code}: ${stderr.slice(0, 600)}`));
    });
  });
}

interface FfprobeInfo {
  duration: number;
  width: number;
  height: number;
  hasVideo: boolean;
  hasAudio: boolean;
  vCodec?: string;
  aCodec?: string;
}

async function ffprobe(filePath: string): Promise<FfprobeInfo> {
  const out = await runCmd('ffprobe', [
    '-v', 'error',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ]).catch(() => '');
  try {
    const j = JSON.parse(out);
    const v = (j.streams || []).find((s: any) => s.codec_type === 'video');
    const a = (j.streams || []).find((s: any) => s.codec_type === 'audio');
    return {
      duration: parseFloat(j.format?.duration || '0') || 0,
      width: v?.width || 0,
      height: v?.height || 0,
      hasVideo: !!v,
      hasAudio: !!a,
      vCodec: v?.codec_name,
      aCodec: a?.codec_name,
    };
  } catch {
    return { duration: 0, width: 0, height: 0, hasVideo: false, hasAudio: false };
  }
}

// Re-encode any input clip to a normalized 1280x720 / yuv420p / 24fps / silent-audio
// segment so the final concat is glitch-free. Adds a silent stereo track because
// the concat demuxer fails when only some inputs have audio.
async function normalizeClip(input: string, output: string, durationS: number): Promise<void> {
  // Pad to fit 1280x720 letterbox (don't crop), AAC silent audio, exact duration.
  await runCmd('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-f', 'lavfi', '-i', `anullsrc=channel_layout=stereo:sample_rate=48000`,
    '-t', durationS.toFixed(3),
    '-vf', `scale=${FINAL_W}:${FINAL_H}:force_original_aspect_ratio=decrease,pad=${FINAL_W}:${FINAL_H}:(ow-iw)/2:(oh-ih)/2:color=black,fps=${FINAL_FPS},format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-shortest',
    '-movflags', '+faststart',
    output,
  ]);
}

// ────────────────────────────────────────────────────────────
// Stage 3 — LTX cinematic shots (live ComfyUI on RTX 5060 Ti)
// ────────────────────────────────────────────────────────────

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = (URL && SR) ? createClient(URL, SR, { auth: { persistSession: false } }) : null;

async function bakeOneLtxShot(shot: ShotPlan, outPath: string): Promise<void> {
  if (!sb) throw new Error('SUPABASE env missing — cannot load comfyui_settings');
  const settings = await comfy.getSettings(sb);
  if (!settings || !settings.enabled) throw new Error('comfyui_settings missing/disabled');
  const baseUrl = settings.base_url?.replace(/\/+$/, '') || `https://${settings.host}`;
  const auth = getAuthHeaders();

  const scene: SceneSpec = {
    version: 1,
    background: 'muted',
    durationSeconds: LTX_DURATION_S,
    ambientIntensity: 0.6,
    meshes: [
      { kind: 'box', position: [0, -0.5, 0], scale: [2, 0.1, 1], color: 'muted' },
    ],
    cameraKeyframes: [
      { timeSeconds: 0, position: [0, 1.2, 4.0], lookAt: [0, 0.5, 0] },
      { timeSeconds: LTX_DURATION_S, position: [0, 1.2, 2.6], lookAt: [0, 0.5, 0] },
    ],
    labels: [],
  };

  const seed = Math.floor(Math.random() * 999_999_999);
  const built = buildSceneWorkflow({
    scene,
    promptPrefix: shot.scene_prompt!,
    style: 'classroom-board',
    resolution: { width: LTX_W, height: LTX_H },
    fps: FINAL_FPS,
    seed,
  });

  console.log(`     queueing LTX shot pos=${shot.position} prompt="${shot.scene_prompt!.slice(0, 80)}…"`);
  const queued = await comfy.queueWorkflow(settings, built.workflow);
  const promptId = queued.prompt_id;
  console.log(`     prompt_id=${promptId}, polling /history (≤25min)`);

  const deadline = Date.now() + 25 * 60_000;
  let history: any = null;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5_000));
    history = await fetch(`${baseUrl}/history/${promptId}`, { headers: auth }).then(r => r.json()).catch(() => null);
    const node = history && history[promptId];
    if (node?.status?.completed) break;
    if (node?.status?.status_str === 'error') break;
  }
  const node = history?.[promptId];
  if (!node || !node.status?.completed || node.status?.status_str === 'error') {
    const msgs = node?.status?.messages || [];
    throw new Error(`LTX render failed status=${node?.status?.status_str} msgs=${JSON.stringify(msgs).slice(0, 800)}`);
  }

  const outputs = node.outputs || {};
  let videoFile: { filename: string; subfolder: string; type: string } | null = null;
  for (const nodeOut of Object.values<any>(outputs)) {
    const arr = nodeOut?.images || nodeOut?.gifs || nodeOut?.videos || [];
    for (const f of arr) {
      if (typeof f?.filename === 'string' && /\.(mp4|webm)$/i.test(f.filename)) {
        videoFile = { filename: f.filename, subfolder: f.subfolder || '', type: f.type || 'output' };
      }
    }
  }
  if (!videoFile) throw new Error(`LTX render returned no MP4: ${JSON.stringify(outputs).slice(0, 500)}`);

  const params = new URLSearchParams({
    filename: videoFile.filename,
    subfolder: videoFile.subfolder,
    type: videoFile.type,
  });
  const dl = await fetch(`${baseUrl}/view?${params}`, { headers: auth });
  if (!dl.ok) throw new Error(`download MP4 status=${dl.status}`);
  const buf = new Uint8Array(await dl.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log(`     saved LTX shot ${outPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

(async () => {
  const t0 = Date.now();
  banner(`MVP E2E LECTURE — ${TOPIC_TITLE}`);
  console.log(`     fresh=${FRESH}  skip-ltx=${SKIP_LTX}  remotion=${USE_REMOTION}`);
  console.log(`     out=${OUT_DIR}`);

  if (FRESH && existsSync(INT_DIR)) {
    rmSync(INT_DIR, { recursive: true, force: true });
    console.log(`     wiped intermediate cache`);
  }
  mkdirSync(INT_DIR, { recursive: true });

  // ── Stage 1+2: lecture plan + shot list (deterministic, no LLM) ──────
  const planPath = path.join(INT_DIR, 'lecture-plan.json');
  await runStage('1+2 plan & shots', async () => {
    writeFileSync(planPath, JSON.stringify(LECTURE_PLAN, null, 2), 'utf8');
    assertExists(planPath, 'lecture-plan.json');
  });

  // ── Stage 3: LTX cinematic shots (intro + outro) ─────────────────────
  const ltxShots: ShotPlan[] = LECTURE_PLAN.shots.filter(s => s.kind === 'comfy');
  const ltxOutPaths: Record<number, string> = {};
  await runStage('3 LTX cinematic shots', async () => {
    for (const shot of ltxShots) {
      const outPath = path.join(INT_DIR, `ltx-shot-${shot.position}.mp4`);
      ltxOutPaths[shot.position] = outPath;
      if (existsSync(outPath) && statSync(outPath).size > 50_000) {
        console.log(`     CACHED ${outPath}`);
        continue;
      }
      if (SKIP_LTX) {
        console.log(`     --skip-ltx and no cached shot for pos=${shot.position} — making plain colour placeholder`);
        // Plain color frame (no drawtext — Windows ffmpeg builds without
        // fontconfig fail on it). LTX shots are baked separately.
        const tint = shot.position === 0 ? '0x223344' : '0x223322';
        await runCmd('ffmpeg', [
          '-y', '-hide_banner', '-loglevel', 'error',
          '-f', 'lavfi', '-i', `color=c=${tint}:s=${LTX_W}x${LTX_H}:r=${FINAL_FPS}:d=${LTX_DURATION_S}`,
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
          '-pix_fmt', 'yuv420p',
          outPath,
        ]);
      } else {
        await bakeOneLtxShot(shot, outPath);
      }
      assertExists(outPath, `ltx-shot-${shot.position}.mp4`);
    }
  });

  // ── Stage 4: Board overlay bake (Ohm's 5-beat ffmpeg) ────────────────
  const boardPath = path.join(INT_DIR, 'board-overlay.mp4');
  await runStage('4 board overlay (ffmpeg drawtext)', async () => {
    if (existsSync(boardPath) && statSync(boardPath).size > 100_000) {
      stageStatus['4 board overlay (ffmpeg drawtext)'] = 'cached';
      console.log(`     CACHED ${boardPath}`);
      return;
    }
    const boardShot = LECTURE_PLAN.shots.find(s => s.kind === 'board')!;
    const boardDuration = boardShot.end - boardShot.start;
    const result = await bakeBoardScene({
      topic: TOPIC_SLUG,
      title: TOPIC_TITLE.toUpperCase(),
      formula: LECTURE_PLAN.formula_unicode,
      labels: LECTURE_PLAN.labels,
      durationSeconds: boardDuration,
      outputPath: boardPath,
    });
    console.log(`     beats: ${result.beatNames.join(' -> ')}`);
    console.log(`     ffmpeg: ${result.ffmpegMs} ms — duration ${result.durationSeconds.toFixed(2)}s`);
    assertExists(boardPath, 'board-overlay.mp4');
  });

  // ── Stage 5: Narration MP3 + script ──────────────────────────────────
  // 9router /audio/speech is the primary TTS path. If it 502s/403s 3 times,
  // fall back to Windows SAPI via PowerShell (System.Speech.Synthesis) →
  // ffmpeg WAV→MP3 so the pipeline still produces real audio. NOT a fake
  // tone — actual synthesized speech.
  const narrationDir = INT_DIR;
  const narrationMp3 = path.join(narrationDir, `${TOPIC_SLUG}-narration.mp3`);
  const narrationSrt = path.join(narrationDir, `${TOPIC_SLUG}-narration.srt`);
  const narrationMetaPath = path.join(narrationDir, 'narration-meta.json');
  let narrationDurationS = 0;
  let narrationScriptText = '';
  await runStage('5+6 narration MP3 + SRT', async () => {
    if (
      existsSync(narrationMp3) && statSync(narrationMp3).size > 1024 &&
      existsSync(narrationSrt) && existsSync(narrationMetaPath)
    ) {
      stageStatus['5+6 narration MP3 + SRT'] = 'cached';
      const meta = JSON.parse(readFileSync(narrationMetaPath, 'utf8'));
      narrationDurationS = meta.durationSeconds;
      narrationScriptText = meta.scriptText;
      console.log(`     CACHED narration ${narrationDurationS.toFixed(2)}s`);
      return;
    }

    // Attempt #1-3: full path via lib/lecture/narration (LLM script + 9router TTS).
    let lastErr: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await generateLectureNarration({
          topic: TOPIC_SLUG,
          durationSeconds: TARGET_DURATION_S,
          outputDir: narrationDir,
        });
        narrationDurationS = result.durationSeconds;
        narrationScriptText = result.scriptText;
        writeFileSync(narrationMetaPath, JSON.stringify({
          scriptText: result.scriptText,
          durationSeconds: result.durationSeconds,
          mp3Path: result.mp3Path,
          srtPath: result.srtPath,
          source: '9router',
        }, null, 2), 'utf8');
        console.log(`     narration via 9router: ${narrationDurationS.toFixed(2)}s, ${narrationScriptText.split(/\s+/).length} words (attempt ${attempt})`);
        assertExists(narrationMp3, 'narration.mp3');
        assertExists(narrationSrt, 'narration.srt');
        return;
      } catch (e: any) {
        lastErr = e;
        const msg = e?.message || String(e);
        console.log(`     attempt ${attempt} failed: ${msg.slice(0, 200)}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 4000 * attempt));
      }
    }

    // Fallback: Windows SAPI. Generate the script via aiChat (cheap, separate
    // from TTS), then synthesize via PowerShell. This is real speech, not a tone.
    console.log(`     9router TTS unhealthy after 3 attempts — falling back to Windows SAPI. Last error: ${(lastErr?.message || '').slice(0, 200)}`);

    // Generate narration script via aiChat (text-only — no TTS dependency).
    let scriptText = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        scriptText = await aiChat({
          messages: [
            { role: 'system', content: 'You are a UPSC physics teacher in a coaching institute. Output the script ONLY, no preamble, no headings, no markdown.' },
            { role: 'user', content: "Write a 35-second narration (around 90 words) introducing Ohm's Law (V=IR) in plain English. Include the analogy of water in a pipe (voltage = water pressure, current = flow rate, resistance = pipe narrowness). End with the formula stated clearly." },
          ],
          temperature: 0.5,
          maxTokens: 400,
        });
        scriptText = scriptText.replace(/^["'`]+|["'`]+$/g, '').replace(/^\s*Script\s*:\s*/i, '').trim();
        if (scriptText.split(/\s+/).length >= 60) break;
        console.log(`     aiChat returned only ${scriptText.split(/\s+/).length} words on attempt ${attempt}, retrying`);
      } catch (e: any) {
        console.log(`     aiChat attempt ${attempt} failed: ${(e?.message || '').slice(0, 200)}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, 3000 * attempt));
      }
    }
    if (scriptText.split(/\s+/).length < 60) {
      // Last-resort canned script — verbatim teacher copy. NOT "fake" — it's a
      // human-authored UPSC-style 90-word block on Ohm's Law. The pipeline
      // continues so the user can validate everything else end-to-end while
      // the LLM/TTS upstream recovers.
      scriptText = "Today we will understand Ohm's Law, one of the foundational laws of electricity. Imagine water flowing through a pipe. Voltage is like the water pressure pushing the water forward. Current is the actual rate of water flow through the pipe. Resistance is how narrow the pipe is — the narrower it gets, the harder it is for water to pass. Ohm's Law states that voltage equals current multiplied by resistance, written as V equals I times R. Remember this simple relationship — it is the cornerstone of every circuit you will ever analyse.";
      console.log(`     using canned UPSC teacher script (${scriptText.split(/\s+/).length} words)`);
    }

    // SAPI synth via PowerShell — produces a 22.05kHz mono WAV.
    const wavTmp = path.join(narrationDir, `${TOPIC_SLUG}-narration.wav`);
    const psScript = [
      `Add-Type -AssemblyName System.Speech;`,
      `$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;`,
      // Pick the best installed voice (Zira/David/Hazel — installed by default on Win10/11).
      `$voices = $s.GetInstalledVoices();`,
      `$v = $voices | Where-Object { $_.VoiceInfo.Name -match 'Zira|David|Hazel' } | Select-Object -First 1;`,
      `if ($v -ne $null) { $s.SelectVoice($v.VoiceInfo.Name) };`,
      `$s.Rate = 0;`, // -10 (slowest) to 10 (fastest); 0 ≈ natural
      `$s.Volume = 100;`,
      `$s.SetOutputToWaveFile('${wavTmp.replace(/\\/g, '\\\\')}');`,
      // Use a single-quoted PowerShell string; pre-escape inner single quotes.
      `$text = '${scriptText.replace(/'/g, "''")}';`,
      `$s.Speak($text);`,
      `$s.Dispose();`,
    ].join(' ');
    await runCmd('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript]);
    if (!existsSync(wavTmp) || statSync(wavTmp).size < 1024) {
      throw new Error(`SAPI synth produced no WAV at ${wavTmp}`);
    }

    // Convert WAV → MP3.
    await runCmd('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', wavTmp,
      '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', '-ac', '1',
      narrationMp3,
    ]);
    rmSync(wavTmp, { force: true });

    // Probe duration for SRT timing.
    const dur = parseFloat(await runCmd('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      narrationMp3,
    ]));
    if (!Number.isFinite(dur) || dur <= 5) {
      throw new Error(`SAPI MP3 duration suspicious: ${dur}s`);
    }
    narrationDurationS = dur;
    narrationScriptText = scriptText;

    // Build SRT from script lines proportional to word counts (same buildSrt as 9router path).
    const sentences = scriptText.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
    const lines: string[] = [];
    for (const sentence of sentences) {
      const words = sentence.split(' ').filter(Boolean);
      if (words.length <= 12) { if (words.length > 0) lines.push(words.join(' ')); continue; }
      for (let i = 0; i < words.length; i += 10) {
        const chunk = words.slice(i, Math.min(i + 10, words.length));
        if (chunk.length < 5 && lines.length > 0) lines[lines.length - 1] += ' ' + chunk.join(' ');
        else lines.push(chunk.join(' '));
      }
    }
    while (lines.length < 4 && lines.some(l => l.split(' ').length >= 4)) {
      let longestIdx = 0;
      for (let i = 1; i < lines.length; i++) if (lines[i].split(' ').length > lines[longestIdx].split(' ').length) longestIdx = i;
      const w = lines[longestIdx].split(' ');
      if (w.length < 4) break;
      const half = Math.floor(w.length / 2);
      lines.splice(longestIdx, 1, w.slice(0, half).join(' '), w.slice(half).join(' '));
    }
    const srt = buildSrt(lines, dur);
    writeFileSync(narrationSrt, srt, 'utf8');

    writeFileSync(narrationMetaPath, JSON.stringify({
      scriptText, durationSeconds: dur, mp3Path: narrationMp3, srtPath: narrationSrt, source: 'windows-sapi-fallback',
    }, null, 2), 'utf8');

    console.log(`     narration via Windows SAPI: ${dur.toFixed(2)}s, ${scriptText.split(/\s+/).length} words`);
    assertExists(narrationMp3, 'narration.mp3');
    assertExists(narrationSrt, 'narration.srt');
  });

  // ── Stage 7a: normalize each segment to 1280x720 ─────────────────────
  // Allocate audio across segments by their target duration; intro+outro get
  // narration head/tail, board gets the body. Simpler: mux narration onto the
  // whole concat at the end. So each segment gets silent audio here.
  const normPaths: string[] = [];
  await runStage('7a normalize segments', async () => {
    // Order: ltx-shot-0 (intro 3s) -> board (30s) -> ltx-shot-2 (outro 3s)
    const ordered = [...LECTURE_PLAN.shots].sort((a, b) => a.start - b.start);
    for (const shot of ordered) {
      const dur = shot.end - shot.start;
      const src = shot.kind === 'board' ? boardPath : ltxOutPaths[shot.position];
      const norm = path.join(INT_DIR, `seg-${shot.position}-norm.mp4`);
      await normalizeClip(src, norm, dur);
      normPaths.push(norm);
      const info = await ffprobe(norm);
      console.log(`     seg pos=${shot.position}: ${info.duration.toFixed(2)}s ${info.width}x${info.height} v=${info.vCodec} a=${info.aCodec}`);
    }
  });

  // ── Stage 7b: concat segments ────────────────────────────────────────
  const concatPath = path.join(INT_DIR, 'concat.txt');
  const concatVideoPath = path.join(INT_DIR, 'concat-no-narration.mp4');
  await runStage('7b concat segments', async () => {
    writeFileSync(concatPath, normPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
    await runCmd('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-f', 'concat', '-safe', '0',
      '-i', concatPath,
      '-c', 'copy',
      concatVideoPath,
    ]);
    const info = await ffprobe(concatVideoPath);
    console.log(`     concat: ${info.duration.toFixed(2)}s ${info.width}x${info.height}`);
    if (!info.hasVideo) throw new Error('concat output has no video stream');
  });

  // ── Stage 7c: mux narration + burn subtitles ─────────────────────────
  // Final layout:
  //   - Video = concat
  //   - Audio = narration.mp3 (replaces silent track from normalize stage)
  //   - Subtitles = burned in via subtitles filter
  // If narration is shorter than video, pad with silence; if longer, truncate.
  const finalMp4 = path.join(OUT_DIR, 'lecture.mp4');
  await runStage('7c mux narration + burn subtitles', async () => {
    // Subtitles filter requires forward-slash paths and escaped colons on Windows.
    const srtForFilter = narrationSrt.replace(/\\/g, '/').replace(/:/g, '\\:');
    // Style: white text, black box, bottom-center. force_style overrides ASS defaults.
    const subtitleFilter = `subtitles='${srtForFilter}':force_style='FontName=Arial,FontSize=22,PrimaryColour=&Hffffff&,OutlineColour=&H80000000&,BorderStyle=4,Outline=1,Shadow=0,MarginV=40'`;

    await runCmd('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', concatVideoPath,
      '-i', narrationMp3,
      '-vf', subtitleFilter,
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k',
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      // shortest so we don't keep audio past the last frame, and we don't keep
      // a long tail of silent video past the narration. The board section is
      // intentionally longer than narration; user will see the recap board with
      // narration's last sentence held over silence — acceptable for MVP.
      '-shortest',
      '-movflags', '+faststart',
      finalMp4,
    ]);
    assertExists(finalMp4, 'lecture.mp4');
    const info = await ffprobe(finalMp4);
    console.log(`     final: ${info.duration.toFixed(2)}s ${info.width}x${info.height} v=${info.vCodec} a=${info.aCodec}`);
    if (!info.hasVideo) throw new Error('final mp4 has no video stream');
    if (!info.hasAudio) throw new Error('final mp4 has no audio stream');
    if (info.vCodec !== 'h264') throw new Error(`final video codec ${info.vCodec} expected h264`);
    if (info.aCodec !== 'aac') throw new Error(`final audio codec ${info.aCodec} expected aac`);
    if (info.width !== FINAL_W || info.height !== FINAL_H) {
      throw new Error(`final dimensions ${info.width}x${info.height} expected ${FINAL_W}x${FINAL_H}`);
    }
    if (info.duration < 25 || info.duration > 90) {
      throw new Error(`final duration ${info.duration.toFixed(2)}s outside [25, 90]s`);
    }
  });

  // ── Stage 8: notes + quiz + timeline + metadata ──────────────────────
  const notesJsonPath = path.join(OUT_DIR, 'mvp-notes.json');
  const notesPdfPath = path.join(OUT_DIR, 'mvp-notes.pdf');
  const quizJsonPath = path.join(OUT_DIR, 'mvp-quiz.json');
  await runStage('8a notes (JSON + PDF)', async () => {
    if (
      existsSync(notesJsonPath) && statSync(notesJsonPath).size > 1000 &&
      existsSync(notesPdfPath) && statSync(notesPdfPath).size > 1000
    ) {
      stageStatus['8a notes (JSON + PDF)'] = 'cached';
      console.log(`     CACHED notes`);
      return;
    }
    const result = await generateLectureNotes({
      topic: TOPIC_TITLE,
      scriptText: narrationScriptText,
      outputDir: OUT_DIR,
    });
    assertExists(result.notesJsonPath, 'mvp-notes.json');
    assertExists(result.notesPdfPath, 'mvp-notes.pdf');
  });

  await runStage('8b quiz JSON', async () => {
    if (existsSync(quizJsonPath) && statSync(quizJsonPath).size > 500) {
      stageStatus['8b quiz JSON'] = 'cached';
      console.log(`     CACHED quiz`);
      return;
    }
    const result = await generateLectureQuiz({
      topic: TOPIC_TITLE,
      scriptText: narrationScriptText,
      outputDir: OUT_DIR,
    });
    assertExists(result.quizJsonPath, 'mvp-quiz.json');
  });

  // ── Stage 8c: timeline.json (scene markers + quiz markers + note anchors) ──
  const timelinePath = path.join(OUT_DIR, 'timeline.json');
  await runStage('8c timeline.json', async () => {
    const finalInfo = await ffprobe(finalMp4);
    const notes = JSON.parse(readFileSync(notesJsonPath, 'utf8'));
    const quiz = JSON.parse(readFileSync(quizJsonPath, 'utf8'));

    const timeline = {
      topic: TOPIC_SLUG,
      title: TOPIC_TITLE,
      duration: Math.round(finalInfo.duration * 100) / 100,
      scenes: LECTURE_PLAN.shots.map(s => ({
        position: s.position,
        start: s.start,
        end: Math.min(s.end, finalInfo.duration),
        type: s.kind === 'comfy' ? (s.position === 0 ? 'intro' : 'outro') : 'formula',
        description: s.description,
      })),
      // Note markers anchor each key_point to a rough timestamp inside the board section.
      noteMarkers: notes.key_points.map((kp: string, idx: number) => {
        const boardStart = 3;
        const boardEnd = Math.min(33, finalInfo.duration);
        const span = boardEnd - boardStart;
        const t = boardStart + (span * idx) / Math.max(1, notes.key_points.length);
        return { id: idx + 1, timestamp: Math.round(t * 100) / 100, text: kp };
      }),
      // Quiz markers fire after the recap.
      quizMarkers: quiz.mcq.map((q: any) => ({
        id: q.id,
        timestamp: Math.round(finalInfo.duration * 100) / 100, // play-out: end of video
        concept: q.concept,
        question: q.question,
      })),
    };
    writeFileSync(timelinePath, JSON.stringify(timeline, null, 2), 'utf8');
    assertExists(timelinePath, 'timeline.json');
  });

  // ── Stage 9 (optional): Remotion parallel render ─────────────────────
  // Per Sprint 9-C slice-2: ffmpeg lecture.mp4 stays the canonical output
  // and is produced unconditionally above. When --remotion is set, we also
  // render lecture-remotion.mp4 from the SAME timeline.json + metadata.json
  // + notes + quiz + subtitles. No fork in pedagogy or planning.
  const remotionMp4 = path.join(OUT_DIR, 'lecture-remotion.mp4');
  let remotionMetrics: { renderTimeMs: number; framesRendered: number; fps: number; bytes: number } | null = null;
  if (USE_REMOTION) {
    await runStage('9 Remotion parallel render', async () => {
      // Dynamic import keeps Remotion out of the script's startup cost when
      // the flag is off (Chromium download + bundler init are heavy).
      const { renderRemotionLecture } = await import('../../lib/video/remotion-renderer');
      const r = await renderRemotionLecture({
        fixturesDir: OUT_DIR,
        outFile: remotionMp4,
        compositionId: 'EducationalLecture',
        subtitlesSrtPath: narrationSrt,
      });
      remotionMetrics = {
        renderTimeMs: r.renderTimeMs,
        framesRendered: r.framesRendered,
        fps: r.fps,
        bytes: r.bytes,
      };
      console.log(`     remotion: ${r.framesRendered} frames @ ${r.fps} fps · ${(r.bytes / 1024).toFixed(1)} KB · ${r.renderTimeMs} ms`);
      assertExists(remotionMp4, 'lecture-remotion.mp4');
    });
  }

  // ── Stage 8d: metadata.json (asset paths, stage timings, renderers) ──
  const metadataPath = path.join(OUT_DIR, 'metadata.json');
  await runStage('8d metadata.json', async () => {
    const finalInfo = await ffprobe(finalMp4);
    const ffmpegBytes = statSync(finalMp4).size;
    const metadata: Record<string, any> = {
      generated_at: new Date().toISOString(),
      topic: { slug: TOPIC_SLUG, title: TOPIC_TITLE, formula: LECTURE_PLAN.formula_unicode },
      pipeline: {
        version: 'mvp-e2e-1',
        stages: stageTimings,
        stage_status: stageStatus,
        wall_seconds: Math.round((Date.now() - t0) / 1000),
      },
      narration: {
        target_seconds: TARGET_DURATION_S,
        actual_seconds: Math.round(narrationDurationS * 100) / 100,
        word_count: narrationScriptText.split(/\s+/).filter(Boolean).length,
        script: narrationScriptText,
      },
      video: {
        width: finalInfo.width,
        height: finalInfo.height,
        duration: Math.round(finalInfo.duration * 100) / 100,
        v_codec: finalInfo.vCodec,
        a_codec: finalInfo.aCodec,
        path: path.relative(ROOT, finalMp4).replace(/\\/g, '/'),
      },
      // Sprint 9-C slice-2 — the canonical ffmpeg lecture.mp4 is the
      // primary renderer; lecture-remotion.mp4 is the parallel programmable
      // path. Both consume the same timeline.json + metadata.json. When
      // --remotion is off, the remotion entry is absent — never an empty
      // stub.
      renderers: {
        ffmpeg: {
          path: path.relative(ROOT, finalMp4).replace(/\\/g, '/'),
          bytes: ffmpegBytes,
        },
        ...(remotionMetrics ? {
          remotion: {
            path: path.relative(ROOT, remotionMp4).replace(/\\/g, '/'),
            bytes: remotionMetrics.bytes,
            render_time_ms: remotionMetrics.renderTimeMs,
            frames_rendered: remotionMetrics.framesRendered,
            fps: remotionMetrics.fps,
            composition: 'EducationalLecture',
          },
        } : {}),
      },
      assets: {
        lecture_mp4: path.relative(ROOT, finalMp4).replace(/\\/g, '/'),
        ...(remotionMetrics ? { lecture_remotion_mp4: path.relative(ROOT, remotionMp4).replace(/\\/g, '/') } : {}),
        narration_mp3: path.relative(ROOT, narrationMp3).replace(/\\/g, '/'),
        subtitles_srt: path.relative(ROOT, narrationSrt).replace(/\\/g, '/'),
        notes_json: path.relative(ROOT, notesJsonPath).replace(/\\/g, '/'),
        notes_pdf: path.relative(ROOT, notesPdfPath).replace(/\\/g, '/'),
        quiz_json: path.relative(ROOT, quizJsonPath).replace(/\\/g, '/'),
        timeline_json: path.relative(ROOT, timelinePath).replace(/\\/g, '/'),
        board_overlay_mp4: path.relative(ROOT, boardPath).replace(/\\/g, '/'),
      },
    };
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
    assertExists(metadataPath, 'metadata.json');
  });

  // ── Final summary ────────────────────────────────────────────────────
  banner('MVP E2E LECTURE — COMPLETE');
  const totalSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`     wall time: ${totalSec}s`);
  for (const [stage, ms] of Object.entries(stageTimings)) {
    const status = stageStatus[stage] || 'ok';
    console.log(`     [${status.padEnd(7)}] ${stage}: ${ms} ms`);
  }
  console.log(`\n   ✔ outputs/mvp/:`);
  const summaryFiles = ['lecture.mp4'];
  if (USE_REMOTION) summaryFiles.push('lecture-remotion.mp4');
  summaryFiles.push('mvp-notes.json', 'mvp-notes.pdf', 'mvp-quiz.json', 'timeline.json', 'metadata.json');
  for (const f of summaryFiles) {
    const p = path.join(OUT_DIR, f);
    if (existsSync(p)) {
      const sz = statSync(p).size;
      console.log(`       - ${f.padEnd(20)} ${(sz / 1024).toFixed(1)} KB`);
    } else {
      console.log(`       - ${f.padEnd(20)} (missing!)`);
    }
  }
  process.exit(0);
})().catch(e => {
  console.error('\n FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
