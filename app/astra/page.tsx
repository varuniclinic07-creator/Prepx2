'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';

interface AstraFrame {
  timestamp: number;
  speaker_text: string;
  visual_hint: string;
  key_concept: string;
}

interface AstraScript {
  id: string;
  topic: string;
  script: AstraFrame[];
  status: string;
}

export default function AstraPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<AstraScript | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // AC-04: Generate script via API
  async function handleGenerate() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/astra/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), language: 'en' }),
      });
      const data = await res.json();
      if (data.script) {
        setScript(data.script);
        setCurrentFrame(0);
        setProgress(0);
      }
    } catch (e) {
      console.error('Failed to generate script', e);
    } finally {
      setLoading(false);
    }
  }

  const frames = script?.script || [];
  const totalFrames = frames.length;

  // AC-05: Auto-advance playback
  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;
    timerRef.current = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= totalFrames - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 8000); // 8 seconds per frame
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalFrames]);

  // Update progress ring
  useEffect(() => {
    if (totalFrames > 0) {
      setProgress(((currentFrame + 1) / totalFrames) * 100);
    }
  }, [currentFrame, totalFrames]);

  // AC-06: Text-to-speech via browser SpeechSynthesis
  const speakCurrent = useCallback(() => {
    if (!window.speechSynthesis || !frames[currentFrame]) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(frames[currentFrame].speaker_text);
    utter.rate = 1;
    utter.pitch = 1;
    utter.lang = 'en-IN';
    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [currentFrame, frames]);

  useEffect(() => {
    if (isPlaying) speakCurrent();
    else window.speechSynthesis?.cancel();
  }, [isPlaying, currentFrame, speakCurrent]);

  const goNext = () => setCurrentFrame(prev => Math.min(prev + 1, totalFrames - 1));
  const goPrev = () => setCurrentFrame(prev => Math.max(prev - 1, 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Astra Stream
        </h1>
        <span className="text-xs text-slate-400 uppercase tracking-wider">AI Video Lectures</span>
      </div>

      {/* Topic input */}
      <div className="flex gap-3">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Enter topic (e.g., Fundamental Rights)"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500"
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {/* Script display */}
      {script && frames.length > 0 && (
        <div className="space-y-4">
          {/* Progress ring */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#334155" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6"
                  strokeWidth="3"
                  strokeDasharray={`${progress * 0.88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="flex-1">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-xs text-slate-400">{currentFrame + 1} / {totalFrames}</span>
          </div>

          {/* Slide card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[200px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-wider text-violet-400 font-semibold bg-violet-500/10 px-2 py-0.5 rounded">
                  Frame {currentFrame + 1}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">
                  {frames[currentFrame].visual_hint}
                </span>
              </div>
              <p className="text-lg text-slate-100 leading-relaxed">
                {frames[currentFrame].speaker_text}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Key Concept: <span className="text-slate-300">{frames[currentFrame].key_concept}</span>
              </span>
              <span className="text-xs text-slate-500">
                {Math.floor(frames[currentFrame].timestamp / 60)}:{String(frames[currentFrame].timestamp % 60).padStart(2, '0')}
              </span>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goPrev}
              disabled={currentFrame === 0}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              ⏮ Prev
            </button>
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition"
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={goNext}
              disabled={currentFrame >= totalFrames - 1}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              Next ⏭
            </button>
          </div>

          {/* Speak button */}
          <button
            onClick={speakCurrent}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm py-2 rounded-lg transition"
          >
            🔊 Read Aloud
          </button>
        </div>
      )}

      {/* Pre-cached topics hint */}
      {!script && !loading && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <p className="text-sm text-slate-400">
            Try topics like: Fundamental Rights, Directive Principles, Parliament, Judiciary, Federalism, Constitutional Amendments, Emergency Provisions, Panchayati Raj, Public Policy, Governance
          </p>
        </div>
      )}
    </div>
  );
}
