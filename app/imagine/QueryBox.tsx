'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (topic: string, durationSeconds: number) => Promise<void>;
  disabled?: boolean;
}

export default function QueryBox({ onSubmit, disabled }: Props) {
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(60);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!topic.trim() || disabled) return;
    setBusy(true);
    try {
      await onSubmit(topic.trim(), duration);
      setTopic('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <label className="block text-sm font-medium text-slate-300">Imagine any topic in 3D</label>
      <textarea
        value={topic}
        onChange={e => setTopic(e.target.value)}
        placeholder="e.g. Big Bang, Dinosaurs, BCE timeline, Gupta Empire, formation of Earth, cosmos..."
        rows={3}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
      />
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-wider text-slate-400 w-20">Duration</span>
        <input
          type="range"
          min={15}
          max={300}
          step={15}
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="text-sm font-mono text-emerald-400 w-16 text-right">{duration}s</span>
      </div>
      <button
        onClick={handleSubmit}
        disabled={busy || disabled || !topic.trim()}
        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition"
      >
        {busy ? 'Spawning Imagine agent…' : 'Imagine in 3D'}
      </button>
    </div>
  );
}
