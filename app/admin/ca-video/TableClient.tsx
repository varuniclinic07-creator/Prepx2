'use client';

// Client table for admin CA Video management.
// Sprint 4-2.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoRow {
  id: string;
  bundle_id: string;
  bundle_date: string;
  title: string;
  theme: string;
  duration_seconds: number;
  render_status: string;
  approval_status: string;
  generated_by: string;
  created_at: string;
}

interface BundleRow {
  id: string;
  bundle_date: string;
  theme: string;
  status: string;
  article_count: number;
}

export default function CaVideoTable({
  videos,
  bundles,
}: {
  videos: VideoRow[];
  bundles: BundleRow[];
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState<string | null>(null);

  async function triggerGeneration(bundleId: string) {
    setGenerating(bundleId);
    try {
      await fetch('/api/admin/ca-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId }),
      });
      router.refresh();
    } catch {
      // ignore
    }
    setGenerating(null);
  }

  async function handleAction(videoId: string, action: string) {
    await fetch(`/api/admin/ca-video/${videoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  // Find bundles without videos.
  const videoBundleIds = new Set(videos.map(v => v.bundle_id));
  const unbundled = bundles.filter(b => !videoBundleIds.has(b.id));

  return (
    <div className="space-y-6">
      {/* Unbundled — quick generate */}
      {unbundled.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Bundles without a video newspaper:</p>
          <div className="flex flex-wrap gap-2">
            {unbundled.map(b => (
              <button
                key={b.id}
                onClick={() => triggerGeneration(b.id)}
                disabled={generating === b.id}
                className="text-xs bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-3 py-1.5 rounded transition"
              >
                {generating === b.id ? '...' : `Generate for ${b.bundle_date} (${b.article_count} articles)`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Videos table */}
      <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">Theme</th>
              <th className="text-left p-3">Duration</th>
              <th className="text-left p-3">Render</th>
              <th className="text-left p-3">Approval</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {videos.map((v) => (
              <tr key={v.id} className="hover:bg-slate-800/30 transition">
                <td className="p-3 text-slate-400">
                  {new Date(v.bundle_date).toLocaleDateString('en-IN')}
                </td>
                <td className="p-3 font-medium max-w-xs truncate">{v.title}</td>
                <td className="p-3 text-cyan-400">{v.theme}</td>
                <td className="p-3 text-slate-400">
                  {Math.floor(v.duration_seconds / 60)}m {v.duration_seconds % 60}s
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    v.render_status === 'rendered' ? 'bg-emerald-900/50 text-emerald-400' :
                    v.render_status === 'rendering' ? 'bg-amber-900/50 text-amber-400' :
                    v.render_status === 'failed' ? 'bg-red-900/50 text-red-400' :
                    v.render_status === 'r3f_only' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{v.render_status}</span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    v.approval_status === 'approved' ? 'bg-emerald-900/50 text-emerald-400' :
                    v.approval_status === 'rejected' ? 'bg-red-900/50 text-red-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>{v.approval_status}</span>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(v.id, 'approve')}
                      className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded transition"
                    >
                      approve
                    </button>
                    <button
                      onClick={() => handleAction(v.id, 'reject')}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition"
                    >
                      reject
                    </button>
                    <button
                      onClick={() => handleAction(v.id, 'regenerate')}
                      className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded transition"
                    >
                      re-gen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {videos.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No video newspapers yet. Generate one from a published bundle above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
