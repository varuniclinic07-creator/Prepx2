// /podcast — daily 5-min podcast player. Shows today's episode (with a
// generate button if it doesn't exist yet) plus the last 30 days of history.
// Player tracks playback progress and writes to podcast_play_history on
// pause/end so we can chart listening over time.

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Headphones, Loader2, Play, RefreshCw, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Card, CardHeader, CardTitle, CardSub } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Episode {
  id: string;
  date: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  audio_url: string | null;
  script_excerpt: string;
  gs_topics_covered: string[];
  duration_seconds: number | null;
}

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayEp = episodes.find((e) => e.date === today) ?? null;
  const history = episodes.filter((e) => e.date !== today);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/podcast/episodes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setEpisodes(json.episodes ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function generateToday() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/podcast/generate-user-episode', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function play(ep: Episode) {
    if (!ep.audio_url) return;
    setActiveId(ep.id);
    setTimeout(() => playerRef.current?.play(), 50);
  }

  async function logPlay(seconds: number, completed: boolean) {
    if (!activeId) return;
    try {
      await fetch('/api/podcast/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode_id: activeId, played_seconds: Math.floor(seconds), completed }),
      });
    } catch {
      // best-effort
    }
  }

  const activeEp = episodes.find((e) => e.id === activeId) ?? null;

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)] text-white">
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/15">
              <Headphones className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Daily Dhwani</h1>
              <p className="text-xs text-white/50">Your 5-minute UPSC briefing — narrated.</p>
            </div>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Today's episode */}
        <GlassCard glow="cyan" padding="md">
          <CardHeader>
            <div>
              <CardTitle>Today — {today}</CardTitle>
              <CardSub>
                {todayEp ? `Status: ${todayEp.status}` : 'Not yet generated'}
              </CardSub>
            </div>
            {!todayEp && (
              <Button variant="primary" size="sm" onClick={generateToday} disabled={generating}>
                {generating ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating</> : <><Sparkles size={14} /> Generate</>}
              </Button>
            )}
            {todayEp?.status === 'failed' && (
              <Button variant="primary" size="sm" onClick={generateToday} disabled={generating}>
                <RefreshCw size={14} /> Retry
              </Button>
            )}
          </CardHeader>

          {todayEp && (
            <>
              <p className="mb-3 text-sm leading-relaxed text-white/65">{todayEp.script_excerpt}…</p>
              {todayEp.audio_url && todayEp.status === 'completed' && (
                <Button variant="primary" size="sm" onClick={() => play(todayEp)}>
                  <Play size={14} /> Play
                </Button>
              )}
              {todayEp.status === 'generating' && (
                <p className="text-xs text-cyan-300">Synthesising audio…</p>
              )}
            </>
          )}
        </GlassCard>

        {/* Active player */}
        {activeEp?.audio_url && (
          <Card padding="md">
            <CardHeader>
              <div>
                <CardTitle>Now playing — {activeEp.date}</CardTitle>
                {activeEp.gs_topics_covered.length > 0 && (
                  <CardSub>Topics: {activeEp.gs_topics_covered.join(', ')}</CardSub>
                )}
              </div>
            </CardHeader>
            <audio
              ref={playerRef}
              src={activeEp.audio_url}
              controls
              className="w-full"
              onPause={(e) => logPlay(e.currentTarget.currentTime, false)}
              onEnded={(e) => logPlay(e.currentTarget.currentTime, true)}
            />
          </Card>
        )}

        {/* History */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            History
          </h2>
          {loading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-white/50">No previous episodes yet — yours will accumulate here.</p>
          ) : (
            <div className="space-y-2">
              {history.map((ep) => (
                <Card key={ep.id} interactive padding="sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{ep.date}</p>
                      <p className="text-[11px] text-white/45">
                        {ep.status === 'completed' ? `${ep.duration_seconds ?? '~5'}s` : ep.status}
                        {ep.gs_topics_covered.length > 0 && ` · ${ep.gs_topics_covered.join(', ')}`}
                      </p>
                    </div>
                    {ep.status === 'completed' && ep.audio_url && (
                      <Button variant="ghost" size="sm" onClick={() => play(ep)}>
                        <Play size={12} /> Play
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
