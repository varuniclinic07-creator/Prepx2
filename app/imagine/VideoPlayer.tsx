'use client';

import { useEffect, useState } from 'react';
import { SceneSpecRenderer } from '@/components/3d/SceneSpecRenderer';
import type { SceneSpec } from '@/lib/3d/scene-spec';

export interface VoiceoverSegment {
  startMs: number;
  endMs: number;
  text: string;
  voice: 'male_in' | 'female_in';
}

interface Props {
  scenes: SceneSpec[];
  segments: VoiceoverSegment[];
  durationSeconds: number;
  onExtend: () => Promise<void>;
  extending: boolean;
}

export default function VideoPlayer({ scenes, segments, durationSeconds, onExtend, extending }: Props) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Drive a single timeline across all beats, advancing beatIndex when the
  // current segment's endMs is crossed. This keeps voiceover text and the
  // active scene in sync.
  useEffect(() => {
    if (segments.length === 0) return;
    const total = segments[segments.length - 1].endMs;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const t = (Date.now() - startedAt) % total;
      setElapsedMs(t);
      let idx = 0;
      while (idx < segments.length - 1 && segments[idx + 1].startMs <= t) idx++;
      setBeatIndex(idx);
    }, 100);
    return () => clearInterval(id);
  }, [segments]);

  if (scenes.length === 0 || segments.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        Generating your 3D explainer…
      </div>
    );
  }

  const currentScene = scenes[Math.min(beatIndex, scenes.length - 1)];
  const currentSegment = segments[Math.min(beatIndex, segments.length - 1)];

  return (
    <div className="space-y-4">
      <div className="relative rounded-2xl overflow-hidden border border-slate-800" style={{ aspectRatio: '16 / 9' }}>
        <SceneSpecRenderer spec={currentScene} autoPlay showControls={false} />
        <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-xs text-emerald-400 font-mono border border-emerald-500/30">
          Beat {beatIndex + 1} of {scenes.length}
        </div>
        <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full text-xs text-slate-300 font-mono border border-slate-700">
          {Math.floor(elapsedMs / 1000)}s / {durationSeconds}s
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
          Voiceover · {currentSegment.voice === 'male_in' ? 'Male (IN)' : 'Female (IN)'}
        </div>
        <p className="text-base text-slate-100 leading-relaxed">{currentSegment.text}</p>
      </div>

      <button
        onClick={onExtend}
        disabled={extending}
        className="w-full py-3 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 disabled:opacity-50 text-cyan-300 font-semibold rounded-lg transition"
      >
        {extending ? 'Extending… (~30s of deeper detail)' : 'Extend by 30s — go deeper'}
      </button>
    </div>
  );
}
