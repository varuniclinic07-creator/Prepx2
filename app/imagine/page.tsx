'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QueryBox from './QueryBox';
import VideoPlayer, { type VoiceoverSegment } from './VideoPlayer';
import type { SceneSpec } from '@/lib/3d/scene-spec';

interface ImagineRow {
  id: string;
  topic_query: string;
  syllabus_tag: string | null;
  duration_seconds: number;
  voiceover_segments: VoiceoverSegment[];
  scene_specs: SceneSpec[];
  render_status: string;
  created_at: string;
}

interface ListItem {
  id: string;
  topic_query: string;
  syllabus_tag: string | null;
  duration_seconds: number;
  scene_specs: SceneSpec[];
  render_status: string;
  created_at: string;
}

export default function ImaginePage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<ImagineRow | null>(null);
  const [recent, setRecent] = useState<ListItem[]>([]);
  const [error, setError] = useState('');
  const [extending, setExtending] = useState(false);

  async function refreshRecent() {
    const res = await fetch('/api/imagine');
    if (!res.ok) return;
    const json = await res.json();
    setRecent(json.items || []);
  }

  useEffect(() => { refreshRecent(); }, []);

  // Polling loop: when activeId is set, poll /api/imagine/[id] every 2s until
  // scene_specs.length > 0. Stops once we've got a populated row.
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/imagine/${activeId}`);
        if (!res.ok) {
          if (!cancelled) setError(`Fetch failed (${res.status})`);
          return;
        }
        const data = await res.json() as ImagineRow;
        if (cancelled) return;
        setActive(data);
        if (Array.isArray(data.scene_specs) && data.scene_specs.length > 0) {
          // Even when we have scenes, keep polling so an extension's appended
          // beats reflow into the player without a manual refresh.
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Poll failed');
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeId]);

  const handleSubmit = async (topicQuery: string, durationSeconds: number) => {
    setError('');
    setActive(null);
    const res = await fetch('/api/imagine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicQuery, durationSeconds }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || 'Failed to start'); return; }
    setActiveId(json.videoId);
    refreshRecent();
  };

  const handleExtend = async () => {
    if (!activeId) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/imagine/${activeId}/extend`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Extend failed'); return; }
      // Polling loop will pick up the appended beats.
    } finally {
      setExtending(false);
    }
  };

  const handleOpenRecent = (id: string) => {
    setActiveId(id);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Imagine any topic in 3D</h1>
          <p className="text-sm text-slate-400 mt-1">Type a topic — Big Bang, dinosaurs, BCE timeline, Gupta empire — and watch a 3D-VFX explainer unfold.</p>
        </div>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition">← Back</Link>
      </div>

      <QueryBox onSubmit={handleSubmit} />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {active && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-100">{active.topic_query}</h2>
            {active.syllabus_tag && (
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                {active.syllabus_tag}
              </span>
            )}
          </div>
          <VideoPlayer
            scenes={active.scene_specs || []}
            segments={active.voiceover_segments || []}
            durationSeconds={active.duration_seconds}
            onExtend={handleExtend}
            extending={extending}
          />
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Imagines</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No imagines yet — type a topic above to start.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map(item => (
              <button
                key={item.id}
                onClick={() => handleOpenRecent(item.id)}
                className="text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-slate-100 truncate">{item.topic_query}</div>
                  <span className="text-xs text-slate-500 font-mono whitespace-nowrap">{item.duration_seconds}s</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {item.syllabus_tag || 'general.exploration'} · {item.scene_specs?.length || 0} beats · {item.render_status}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
