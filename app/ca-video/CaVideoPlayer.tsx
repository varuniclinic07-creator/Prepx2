'use client';

// CA Video Newspaper player — client component with SceneSpecRenderer.
// Sprint 4-2.

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const SceneSpecRenderer = dynamic(
  () => import('@/components/3d/SceneSpecRenderer').then((m) => m.SceneSpecRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-slate-500">Loading 3D…</div>
    ),
  },
);

interface Beat {
  startMs: number;
  endMs: number;
  voiceover: { text: string; voice: string };
  segmentType: string;
}

interface CaVideoPlayerProps {
  video: {
    id: string;
    title: string;
    theme: string;
    bundle_date: string;
    duration_seconds: number;
    scene_specs: any[];
    script_markers: Beat[];
    render_status: string;
    signed_url?: string;
  };
}

export default function CaVideoPlayer({ video }: CaVideoPlayerProps) {
  const [currentBeat, setCurrentBeat] = useState(0);
  const [progress, setProgress] = useState(0);
  const scenes = Array.isArray(video.scene_specs) ? video.scene_specs : [];
  const markers = Array.isArray(video.script_markers) ? video.script_markers : [];

  useEffect(() => {
    if (markers.length === 0) return;
    const totalMs = markers[markers.length - 1].endMs;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = prev + 100;
        const newBeat = markers.findIndex(
          (b: Beat) => next >= b.startMs && next < b.endMs
        );
        if (newBeat >= 0 && newBeat !== currentBeat) {
          setCurrentBeat(newBeat);
        }
        if (next >= totalMs) return 0;
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [markers, currentBeat]);

  const activeScene = scenes[currentBeat];
  const activeMarker = markers[currentBeat];
  const totalMs = markers.length > 0 ? markers[markers.length - 1].endMs : video.duration_seconds * 1000;

  return (
    <div className="space-y-4">
      {/* Video player area */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ height: 480 }}>
        {activeScene ? (
          <SceneSpecRenderer spec={activeScene} autoPlay />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="text-center">
              <div className="text-6xl mb-4">&#x1F4F0;</div>
              <p className="text-lg">Video Newspaper loading...</p>
              <p className="text-sm mt-2">
                {video.render_status === 'r3f_only' ? '3D preview mode' :
                 video.render_status === 'rendered' ? 'Full video available' :
                 video.render_status}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-cyan-500 h-full transition-all duration-100 linear"
          style={{ width: `${totalMs > 0 ? (progress / totalMs) * 100 : 0}%` }}
        />
      </div>

      {/* Current voiceover text */}
      {activeMarker && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeMarker.segmentType === 'intro' ? 'bg-blue-900/50 text-blue-300' :
              activeMarker.segmentType === 'wrap_up' ? 'bg-emerald-900/50 text-emerald-300' :
              'bg-cyan-900/50 text-cyan-300'
            }`}>
              {activeMarker.segmentType?.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-500">
              {Math.floor(activeMarker.startMs / 1000)}s - {Math.floor(activeMarker.endMs / 1000)}s
            </span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed">{activeMarker.voiceover?.text}</p>
        </div>
      )}

      {/* Beat navigation */}
      <div className="flex flex-wrap gap-2">
        {markers.map((m: Beat, i: number) => (
          <button
            key={i}
            onClick={() => { setCurrentBeat(i); setProgress(m.startMs); }}
            className={`text-xs px-3 py-1 rounded transition ${
              i === currentBeat
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {m.segmentType?.replace(/_/g, ' ')} {Math.floor(m.startMs / 1000)}s
          </button>
        ))}
      </div>

      {/* Full MP4 link when rendered */}
      {video.signed_url && (
        <div className="text-center">
          <a
            href={video.signed_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg px-6 py-2 transition"
          >
            Watch Full Video
          </a>
        </div>
      )}
    </div>
  );
}
