// Lecture narration generator — produces a teacher-style MP3 + synced SRT.
// Used by MVP-5 to overlay narration onto LTX cinematic teacher shots.
//
// Pipeline:
//   1. aiChat → ~90-word UPSC-teacher script (Ohm's Law et al.)
//   2. textToSpeech → MP3 bytes via 9router
//   3. ffprobe → real audio duration
//   4. Build SRT cues (~6s windows, 8-12 words/line) timed proportionally to
//      word count so the last cue end <= MP3 duration.

import { aiChat, textToSpeech } from '@/lib/ai-router';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface NarrationOpts {
  topic: string;
  durationSeconds: number;
  outputDir: string;
}

export interface NarrationResult {
  scriptText: string;
  mp3Path: string;
  srtPath: string;
  durationSeconds: number;
}

const TOPIC_PROMPTS: Record<string, string> = {
  'ohms-law':
    "Write a 35-second narration (around 90 words) introducing Ohm's Law (V=IR) in plain English. Include the analogy of water in a pipe (voltage = water pressure, current = flow rate, resistance = pipe narrowness). End with the formula stated clearly.",
};

function topicPrompt(topic: string, durationSeconds: number): string {
  const base = TOPIC_PROMPTS[topic];
  if (base) return base;
  const words = Math.round((durationSeconds / 35) * 90);
  return `Write a ${durationSeconds}-second narration (around ${words} words) introducing "${topic}" in plain English. Use one concrete analogy. End with a one-sentence summary.`;
}

async function generateScript(topic: string, durationSeconds: number): Promise<string> {
  const userPrompt = topicPrompt(topic, durationSeconds);
  const raw = await aiChat({
    messages: [
      {
        role: 'system',
        content:
          'You are a UPSC physics teacher in a coaching institute. Output the script ONLY, no preamble, no headings, no markdown.',
      },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.5,
    maxTokens: 400,
  });
  // Strip wrapper quotes / leading "Script:" labels that some tiers emit.
  return raw
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^\s*Script\s*:\s*/i, '')
    .trim();
}

function probeDuration(mp3Path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      mp3Path,
    ]);
    let out = '', errOut = '';
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.stderr.on('data', (d) => { errOut += d.toString(); });
    p.on('error', (e) => reject(e));
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exit ${code}: ${errOut}`));
      const v = parseFloat(out.trim());
      if (!Number.isFinite(v) || v <= 0) return reject(new Error(`ffprobe returned no duration: "${out}"`));
      resolve(v);
    });
  });
}

// Split text into cue lines of 8-12 words (greedy, sentence-aware).
function chunkIntoLines(script: string): string[] {
  const sentences = script.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/);
  const lines: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(' ').filter(Boolean);
    if (words.length <= 12) {
      if (words.length > 0) lines.push(words.join(' '));
      continue;
    }
    // long sentence — chop into ~10-word windows
    for (let i = 0; i < words.length; i += 10) {
      const chunk = words.slice(i, Math.min(i + 10, words.length));
      if (chunk.length < 5 && lines.length > 0) {
        // tail-merge tiny tail into previous line so we don't end on 2 words
        lines[lines.length - 1] += ' ' + chunk.join(' ');
      } else {
        lines.push(chunk.join(' '));
      }
    }
  }
  return lines;
}

function fmtTs(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export function buildSrt(lines: string[], audioDuration: number): string {
  const wordCounts = lines.map((l) => l.split(' ').filter(Boolean).length);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0) || 1;
  const cues: { idx: number; start: number; end: number; text: string }[] = [];
  let cursor = 0;
  for (let i = 0; i < lines.length; i++) {
    const span = (wordCounts[i] / totalWords) * audioDuration;
    const start = cursor;
    let end = cursor + span;
    if (i === lines.length - 1) end = audioDuration; // pin last cue
    cues.push({ idx: i + 1, start, end, text: lines[i] });
    cursor = end;
  }
  return cues
    .map((c) => `${c.idx}\n${fmtTs(c.start)} --> ${fmtTs(c.end)}\n${c.text}\n`)
    .join('\n');
}

export async function generateLectureNarration(opts: NarrationOpts): Promise<NarrationResult> {
  const { topic, durationSeconds, outputDir } = opts;
  await fs.mkdir(outputDir, { recursive: true });

  const scriptText = await generateScript(topic, durationSeconds);
  if (!scriptText || scriptText.split(/\s+/).length < 20) {
    throw new Error(`Lecture script too short (${scriptText.length} chars): ${scriptText.slice(0, 200)}`);
  }

  const mp3Bytes = await textToSpeech(scriptText);
  if (!mp3Bytes || mp3Bytes.length < 1024) {
    throw new Error(`TTS returned ${mp3Bytes?.length ?? 0} bytes — refusing to ship`);
  }

  const mp3Path = path.join(outputDir, `${topic}-narration.mp3`);
  const srtPath = path.join(outputDir, `${topic}-narration.srt`);
  await fs.writeFile(mp3Path, mp3Bytes);

  const realDuration = await probeDuration(mp3Path);

  const lines = chunkIntoLines(scriptText);
  if (lines.length < 4) {
    // Force at least 4 cues by re-splitting the longest line(s).
    while (lines.length < 4) {
      let longestIdx = 0;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].split(' ').length > lines[longestIdx].split(' ').length) longestIdx = i;
      }
      const words = lines[longestIdx].split(' ');
      if (words.length < 4) break;
      const half = Math.floor(words.length / 2);
      lines.splice(longestIdx, 1, words.slice(0, half).join(' '), words.slice(half).join(' '));
    }
  }
  const srt = buildSrt(lines, realDuration);
  await fs.writeFile(srtPath, srt, 'utf8');

  return { scriptText, mp3Path, srtPath, durationSeconds: realDuration };
}
