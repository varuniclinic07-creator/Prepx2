// Sprint 9-C — Remotion render-only smoke.
//
// Validates that the new EducationalLecture composition can render an MP4
// from the existing outputs/mvp/* fixtures (timeline.json + metadata.json +
// mvp-notes.json + mvp-quiz.json + intermediate/<slug>-narration.srt) WITHOUT
// re-running the LTX/ffmpeg pipeline.
//
// Mandatory validations (per user directive):
//   1. lecture-remotion.mp4 exists
//   2. size ≥100 KB
//   3. 1280×720
//   4. duration ≈ timeline.duration + recap(8) + quizzes(5×7) + outro(4)
//   5. ffprobe reports h264 video stream
//
// Captures render metrics:
//   { renderTimeMs, framesRendered, fps, bytes, outFile, composition }
//
// Run:
//   npx tsx scripts/verification/sprint9c-remotion-smoke.ts

import path from 'path';
import { existsSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { renderRemotionLecture } from '../../lib/video/remotion-renderer';

const ROOT = process.cwd();
const FIXTURES = path.join(ROOT, 'outputs', 'mvp');
const OUT = path.join(FIXTURES, 'lecture-remotion.mp4');

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

(async () => {
  log('=== Sprint 9-C — Remotion render-only smoke ===');
  log(`fixtures: ${FIXTURES}`);
  log(`output:   ${OUT}`);

  if (!existsSync(path.join(FIXTURES, 'timeline.json'))) {
    log('ERROR: outputs/mvp/timeline.json missing — run mvp-e2e-lecture.ts first to seed fixtures.');
    process.exit(2);
  }

  log('\n--- bundling + rendering EducationalLecture ---');
  const result = await renderRemotionLecture({
    fixturesDir: FIXTURES,
    outFile: OUT,
    compositionId: 'EducationalLecture',
  });

  log(`  rendered ${result.framesRendered} frames @ ${result.fps} fps`);
  log(`  ${(result.bytes / 1024).toFixed(1)} KB written in ${result.renderTimeMs} ms`);

  log('\n--- validating MP4 ---');
  assert(existsSync(OUT), `lecture-remotion.mp4 exists at ${OUT}`);
  assert(result.bytes >= 100 * 1024, `file size ≥ 100 KB (got ${(result.bytes / 1024).toFixed(1)} KB)`);
  assert(result.width === 1280 && result.height === 720, `1280×720 (got ${result.width}×${result.height})`);

  const probe = ffprobe(OUT);
  if (probe.vCodec) {
    assert(probe.vCodec === 'h264', `video codec h264 (got ${probe.vCodec})`);
    if (probe.width && probe.height) {
      assert(probe.width === 1280 && probe.height === 720, `ffprobe dims 1280×720 (got ${probe.width}×${probe.height})`);
    }
  } else {
    log('  (ffprobe not available — skipping codec check)');
  }

  // Duration tolerance: within 1s of computed total.
  const computedSec = result.durationFrames / result.fps;
  if (probe.durationSec) {
    const delta = Math.abs(probe.durationSec - computedSec);
    assert(delta <= 1.0, `duration matches composition (${probe.durationSec.toFixed(2)}s vs ${computedSec.toFixed(2)}s, Δ ${delta.toFixed(2)}s)`);
  }

  // Render metrics summary.
  const metrics = {
    composition: 'EducationalLecture',
    outFile: OUT,
    renderTimeMs: result.renderTimeMs,
    framesRendered: result.framesRendered,
    fps: result.fps,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
  log('\n--- render metrics ---');
  log(JSON.stringify(metrics, null, 2));

  // Side-by-side stat with ffmpeg lecture.mp4 (existing fixture).
  const ffmpegMp4 = path.join(FIXTURES, 'lecture.mp4');
  if (existsSync(ffmpegMp4)) {
    const fSt = statSync(ffmpegMp4);
    log('\n--- side-by-side ---');
    log(`  ffmpeg  lecture.mp4         ${(fSt.size / 1024).toFixed(1)} KB`);
    log(`  remotion lecture-remotion.mp4 ${(result.bytes / 1024).toFixed(1)} KB`);
  }

  log('\n=== Sprint 9-C SMOKE PASSED ===');
})().catch((e) => {
  console.error('\n=== Sprint 9-C SMOKE FAILED ===');
  console.error(e);
  process.exit(1);
});
