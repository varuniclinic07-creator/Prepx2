'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { parseSceneSpec, type SceneSpec } from '@/lib/3d/scene-spec';

// SceneSpecRenderer pulls @react-three/fiber which is browser-only — keep
// it out of the SSR bundle.
const SceneSpecRenderer = dynamic(
  () => import('@/components/3d/SceneSpecRenderer').then((m) => m.SceneSpecRenderer),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-950 rounded-2xl" /> },
);

export interface MnemonicCard {
  id: string;
  topic_id: string;
  user_id: string | null;
  topic_query: string;
  style: 'acronym' | 'story' | 'rhyme' | 'visual';
  text: string;
  explanation: string;
  scene_spec: any;
  render_status: string;
  comfy_video_url: string | null;
}

const STYLE_LABELS: Record<MnemonicCard['style'], string> = {
  acronym: 'Acronym',
  story:   'Story',
  rhyme:   'Rhyme',
  visual:  'Visual',
};

const STYLE_TINTS: Record<MnemonicCard['style'], string> = {
  acronym: 'border-cyan-500/40',
  story:   'border-amber-500/40',
  rhyme:   'border-fuchsia-500/40',
  visual:  'border-emerald-500/40',
};

export function MnemonicCards({ items }: { items: MnemonicCard[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100 border-t border-slate-800 pt-6">
        Mnemonics
      </h2>
      <p className="text-sm text-slate-400">
        Each mnemonic ships with a 3D animation. Click the canvas to orbit the scene.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {items.map((m) => (
          <MnemonicCardView key={m.id} card={m} />
        ))}
      </div>
    </section>
  );
}

function MnemonicCardView({ card }: { card: MnemonicCard }) {
  const scene: SceneSpec | null = parseSceneSpec(card.scene_spec);
  return (
    <article className={`bg-slate-900 border ${STYLE_TINTS[card.style]} rounded-2xl overflow-hidden flex flex-col`}>
      <div className="h-[220px] bg-slate-950">
        {scene ? (
          <SceneSpecRenderer spec={scene} className="w-full h-full" autoPlay showControls={false} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
            scene unavailable
          </div>
        )}
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {STYLE_LABELS[card.style]}
          </span>
          <RatingRow mnemonicId={card.id} />
        </div>
        <p className="text-slate-100 text-base leading-snug whitespace-pre-line">{card.text}</p>
        {card.explanation && (
          <p className="text-xs text-slate-500 leading-relaxed">{card.explanation}</p>
        )}
      </div>
    </article>
  );
}

function RatingRow({ mnemonicId }: { mnemonicId: string }) {
  const [current, setCurrent] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function rate(value: number) {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/mnemonics/${mnemonicId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: value }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setCurrent(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || current) >= n;
        return (
          <button
            key={n}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(n)}
            onClick={() => rate(n)}
            className={`text-base leading-none transition ${filled ? 'text-amber-400' : 'text-slate-600'} hover:text-amber-300 disabled:opacity-50`}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
          >
            &#9733;
          </button>
        );
      })}
      {done && <span className="ml-2 text-emerald-400 text-xs">Saved</span>}
      {err && <span className="ml-2 text-rose-400 text-xs">{err}</span>}
    </div>
  );
}
