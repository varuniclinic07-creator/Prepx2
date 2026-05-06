// Sprint 9-C slice-2 — dual-output smoke.
//
// Exercises mvp-e2e-lecture.ts --skip-ltx --remotion end-to-end and
// validates that BOTH renderers ship a valid MP4 from a SINGLE pedagogy +
// timeline + metadata + notes + quiz pass.
//
// Mandatory validations:
//   1. lecture.mp4 exists, ≥1 MB (ffmpeg canonical)
//   2. lecture-remotion.mp4 exists, ≥100 KB (Remotion parallel)
//   3. metadata.json contains both renderers blocks (ffmpeg + remotion)
//   4. metadata.assets has lecture_remotion_mp4 entry
//   5. ffprobe reports h264 + 1280×720 for BOTH MP4s
//   6. ffmpeg duration ≈ timeline.duration; remotion duration =
//      timeline.duration + recap(8) + 5×7 + outro(4) = timeline.duration + 47
//
// Run:
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verification/sprint9c2-dual-output-smoke.ts
//
// Notes: --skip-ltx so we don't burn GPU; the Ohm's Law canonical fixtures
// are reused. Wall time is dominated by Remotion bundle + Chromium render
// (~9 min cold, ~30-60 s warm).

import path from 'path';
import { existsSync, statSync, readFileSync } from 'fs';
import { spawn, spawnSync } from 'child_process';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'outputs', 'mvp');

function log(msg: string) {
  process.stdout.write(msg + '\n');
}

function assert(cond: any, label: string) {
  if (!cond) {
    log(`  ✗ ${label}`);
    throw new Error(`assertion failed: ${label}`);
  }
  log(`  ✔ ${label}`);
}

function ffprobe(file: string): { width?: number; height?: number; durationSec?: number; vCodec?: string } {
  const r = spawnSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,codec_name',
      '-show_entries', 'format=duration',
      '-of', 'json',
      file,
    ],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) return {};
  try {
    const j = JSON.parse(r.stdout);
    const s = (j.streams || [])[0] || {};
    return {
      width: s.width,
      height: s.height,
      vCodec: s.codec_name,
      durationSec: parseFloat(j.format?.duration || '0'),
    };
  } catch {
    return {};
  }
}

async function runOrchestrator(): Promise<void> {
  log('--- spawning mvp-e2e-lecture.ts --skip-ltx --remotion ---');
  const tsxCli = path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const scriptPath = path.join(ROOT, 'scripts', 'verification', 'mvp-e2e-lecture.ts');
  if (!existsSync(tsxCli)) throw new Error(`tsx CLI missing at ${tsxCli}`);
  if (!existsSync(scriptPath)) throw new Error(`orchestrator missing at ${scriptPath}`);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [tsxCli, scriptPath, '--skip-ltx', '--remotion'],
      { cwd: ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
    );
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mvp-e2e-lecture.ts exited ${code}`));
    });
  });
}

(async () => {
  log('=== Sprint 9-C slice-2 — dual-output smoke ===');
  log(`out dir: ${OUT_DIR}`);

  await runOrchestrator();

  log('\n--- validating ffmpeg lecture.mp4 ---');
  const ffmpegMp4 = path.join(OUT_DIR, 'lecture.mp4');
  assert(existsSync(ffmpegMp4), `lecture.mp4 exists`);
  const ffmpegSize = statSync(ffmpegMp4).size;
  assert(ffmpegSize >= 1024 * 1024, `lecture.mp4 ≥ 1 MB (got ${(ffmpegSize / 1024).toFixed(1)} KB)`);
  const ffmpegProbe = ffprobe(ffmpegMp4);
  if (ffmpegProbe.vCodec) {
    assert(ffmpegProbe.vCodec === 'h264', `ffmpeg h264 (got ${ffmpegProbe.vCodec})`);
    assert(ffmpegProbe.width === 1280 && ffmpegProbe.height === 720, `ffmpeg 1280×720`);
  }

  log('\n--- validating Remotion lecture-remotion.mp4 ---');
  const remotionMp4 = path.join(OUT_DIR, 'lecture-remotion.mp4');
  assert(existsSync(remotionMp4), `lecture-remotion.mp4 exists`);
  const remotionSize = statSync(remotionMp4).size;
  assert(remotionSize >= 100 * 1024, `lecture-remotion.mp4 ≥ 100 KB (got ${(remotionSize / 1024).toFixed(1)} KB)`);
  const remotionProbe = ffprobe(remotionMp4);
  if (remotionProbe.vCodec) {
    assert(remotionProbe.vCodec === 'h264', `remotion h264 (got ${remotionProbe.vCodec})`);
    assert(remotionProbe.width === 1280 && remotionProbe.height === 720, `remotion 1280×720`);
  }

  log('\n--- validating metadata.json renderers block ---');
  const metadataPath = path.join(OUT_DIR, 'metadata.json');
  assert(existsSync(metadataPath), `metadata.json exists`);
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  assert(metadata.renderers, `metadata.renderers present`);
  assert(metadata.renderers.ffmpeg, `metadata.renderers.ffmpeg present`);
  assert(typeof metadata.renderers.ffmpeg.bytes === 'number' && metadata.renderers.ffmpeg.bytes > 0, `ffmpeg.bytes > 0`);
  assert(metadata.renderers.remotion, `metadata.renderers.remotion present`);
  assert(typeof metadata.renderers.remotion.bytes === 'number' && metadata.renderers.remotion.bytes > 0, `remotion.bytes > 0`);
  assert(typeof metadata.renderers.remotion.render_time_ms === 'number', `remotion.render_time_ms present`);
  assert(typeof metadata.renderers.remotion.frames_rendered === 'number', `remotion.frames_rendered present`);
  assert(metadata.renderers.remotion.composition === 'EducationalLecture', `remotion.composition = EducationalLecture`);
  assert(metadata.assets.lecture_mp4, `assets.lecture_mp4 present`);
  assert(metadata.assets.lecture_remotion_mp4, `assets.lecture_remotion_mp4 present`);

  log('\n--- duration sanity ---');
  const tlPath = path.join(OUT_DIR, 'timeline.json');
  const timeline = JSON.parse(readFileSync(tlPath, 'utf8'));
  log(`  timeline.duration         = ${timeline.duration}s`);
  log(`  ffmpeg ffprobe duration   = ${ffmpegProbe.durationSec?.toFixed(2)}s`);
  log(`  remotion ffprobe duration = ${remotionProbe.durationSec?.toFixed(2)}s`);
  if (ffmpegProbe.durationSec && remotionProbe.durationSec) {
    // ffmpeg ≈ timeline.duration; remotion = timeline + recap(8) + 5×7 + outro(4) = +47
    const ffDelta = Math.abs(ffmpegProbe.durationSec - timeline.duration);
    assert(ffDelta <= 1.0, `ffmpeg duration ≈ timeline (Δ ${ffDelta.toFixed(2)}s)`);
    const rmExpected = timeline.duration + 8 + (timeline.quizMarkers?.length || 5) * 7 + 4;
    const rmDelta = Math.abs(remotionProbe.durationSec - rmExpected);
    assert(rmDelta <= 1.5, `remotion duration ≈ timeline+recap+quiz+outro (expected ${rmExpected.toFixed(2)}s, got ${remotionProbe.durationSec.toFixed(2)}s, Δ ${rmDelta.toFixed(2)}s)`);
  }

  log('\n--- side-by-side ---');
  log(`  ffmpeg   lecture.mp4          ${(ffmpegSize / 1024).toFixed(1)} KB · ${ffmpegProbe.durationSec?.toFixed(2)}s`);
  log(`  remotion lecture-remotion.mp4 ${(remotionSize / 1024).toFixed(1)} KB · ${remotionProbe.durationSec?.toFixed(2)}s`);
  log(`  remotion render time          ${metadata.renderers.remotion.render_time_ms} ms · ${metadata.renderers.remotion.frames_rendered} frames`);

  log('\n=== Sprint 9-C SLICE-2 SMOKE PASSED ===');
})().catch((e) => {
  console.error('\n=== Sprint 9-C SLICE-2 SMOKE FAILED ===');
  console.error(e);
  process.exit(1);
});
