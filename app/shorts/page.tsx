'use client';

// Concept Shorts browse page — 120-second topic revision videos.
// Sprint 4-1. Reuses patterns from app/imagine/page.tsx.

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-browser';

const SceneSpecRenderer = dynamic(
  () => import('@/components/3d/SceneSpecRenderer').then((m) => m.SceneSpecRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-slate-500">Loading 3D…</div>
    ),
  },
);

interface ShortItem {
  id: string;
  topic_id: string;
  concept_tag: string;
  title: string;
  style: string;
  render_status: string;
  approval_status: string;
  duration_seconds: number;
  created_at: string;
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [activeShort, setActiveShort] = useState<ShortItem | null>(null);
  const [sceneData, setSceneData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [topicId, setTopicId] = useState('');
  const [conceptTag, setConceptTag] = useState('');
  const [duration, setDuration] = useState(120);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const supabase = createClient();

  const fetchShorts = useCallback(async () => {
    const res = await fetch('/api/shorts?limit=20');
    if (res.ok) {
      const data = await res.json();
      setShorts(data.shorts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchShorts(); }, [fetchShorts]);

  const fetchFull = async (id: string) => {
    const res = await fetch(`/api/shorts/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data.short?.scene_spec) {
        setSceneData(Array.isArray(data.short.scene_spec) ? data.short.scene_spec[0] : data.short.scene_spec);
        setPolling(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!topicId || !conceptTag) {
      setError('Topic ID and concept tag are required');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId, conceptTag, durationSeconds: duration }),
      });
      const data = await res.json();
      if (res.ok && data.shortId) {
        setActiveShort({ id: data.shortId, concept_tag: conceptTag } as ShortItem);
        setPolling(true);
        const poll = setInterval(async () => {
          const detail = await fetch(`/api/shorts/${data.shortId}`);
          const detailData = await detail.json();
          if (detailData.short?.scene_spec) {
            clearInterval(poll);
            setSceneData(Array.isArray(detailData.short.scene_spec) ? detailData.short.scene_spec[0] : detailData.short.scene_spec);
            setPolling(false);
          }
        }, 2000);
        setTimeout(() => { clearInterval(poll); setPolling(false); }, 120000);
        fetchShorts();
      } else {
        setError(data.error || 'Failed to create short');
      }
    } catch {
      setError('Network error');
    }
    setCreating(false);
  };

  const styleBadge = (style: string) => {
    const map: Record<string, string> = {
      concept_explainer: 'bg-cyan-900/50 text-cyan-300 border border-cyan-700',
      pyq_breaker: 'bg-amber-900/50 text-amber-300 border border-amber-700',
      mnemonic_visual: 'bg-purple-900/50 text-purple-300 border border-purple-700',
      diagram_tour: 'bg-emerald-900/50 text-emerald-300 border border-emerald-700',
    };
    return map[style] || 'bg-slate-800 text-slate-300';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-2">Concept Shorts</h1>
      <p className="text-slate-400 mb-8">120-second UPSC topic revision videos. Visual-first, no fluff.</p>

      {/* Create form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Create a New Short</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Topic ID (UUID)"
            value={topicId}
            onChange={e => setTopicId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500"
          />
          <input
            type="text"
            placeholder="Concept tag (e.g., fundamental-rights)"
            value={conceptTag}
            onChange={e => setConceptTag(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder:text-slate-500"
          />
          <select
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200"
          >
            <option value={90}>90 seconds</option>
            <option value={120}>2 minutes (default)</option>
            <option value={180}>3 minutes</option>
            <option value={240}>4 minutes</option>
            <option value={300}>5 minutes</option>
          </select>
          <button
            onClick={handleCreate}
            disabled={creating || polling}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium rounded-lg px-6 py-2 transition"
          >
            {creating ? 'Creating...' : 'Generate Short'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        {polling && <p className="text-cyan-400 text-sm mt-3 animate-pulse">Generating your concept short...</p>}
      </div>

      {/* 3D Viewer */}
      {sceneData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8" style={{ height: 400 }}>
          <SceneSpecRenderer spec={sceneData} autoPlay />
        </div>
      )}

      {/* Shorts grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shorts.map(s => (
            <button
              key={s.id}
              onClick={() => { setActiveShort(s); fetchFull(s.id); }}
              className={`text-left bg-slate-900 border rounded-xl p-4 transition hover:border-cyan-700 ${
                activeShort?.id === s.id ? 'border-cyan-500 ring-1 ring-cyan-500/50' : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${styleBadge(s.style)}`}>
                  {s.style?.replace(/_/g, ' ') || 'concept'}
                </span>
                <span className="text-xs text-slate-500">{s.duration_seconds}s</span>
              </div>
              <h3 className="font-medium text-sm text-slate-200 mb-1">
                {s.title || s.concept_tag}
              </h3>
              <p className="text-xs text-slate-500">{s.concept_tag}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.approval_status === 'approved' ? 'bg-emerald-900/50 text-emerald-400' :
                  s.approval_status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {s.approval_status}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  s.render_status === 'rendered' ? 'bg-emerald-900/50 text-emerald-400' :
                  s.render_status === 'r3f_only' ? 'bg-blue-900/50 text-blue-400' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {s.render_status}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
