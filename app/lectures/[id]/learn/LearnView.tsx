'use client';

// Sprint 9-D Phase D — interactive learning UI.
//
// THIN LENS over /api/lectures/[id]/query.
// The client owns NO retrieval, NO timestamps, NO formula inference — those
// all come from the deterministic semantic engine. This component is just:
//   1. send query
//   2. render grounded response
//   3. trigger replay jumps on the local <video>
//
// Seven small components live in this file (kept together intentionally so
// the surface area is greppable from one place):
//   - <LearnView />            (top-level layout)
//   - <LecturePlayer />        (controlled <video>)
//   - <AskExplanationPanel />  (input + history)
//   - <ResponseCard />         (one grounded response)
//   - <ReplayTimelineChips />  (▶ jump buttons)
//   - <FormulaCard />          (V = IR card)
//   - <NotesCard />            (related notes block)

import { forwardRef, useCallback, useRef, useState } from 'react';

// ─── Types — mirror /api/lectures/[id]/query/route.ts response shape ────

interface ReplaySegment { start: number; end: number; }
interface MatchedConcept { id: string; name: string; definition: string; }
interface QueryResponse {
  lectureId: string;
  query: string;
  intent: string;
  matchedConcept: MatchedConcept | null;
  confidence: number;
  timestamps: ReplaySegment[];
  replaySegments: ReplaySegment[];
  formulas: string[];
  relatedNotes: Array<{ idx: number; text: string }>;
  learningObjectives: string[];
  relatedQuiz: number[];
  sourceScenes: number[];
  answer: string | null;
  cached: boolean;
  phraseError?: string;
}

interface QueryHistoryItem {
  q: string;
  response: QueryResponse;
  ts: number;
}

// ─── <LearnView /> ─────────────────────────────────────────────────────

export function LearnView(props: {
  lectureJobId: string;
  title: string;
  durationSec: number;
  videoUrl: string;
}) {
  const { lectureJobId, title, durationSec, videoUrl } = props;
  const videoRef = useRef<HTMLVideoElement>(null);

  const seekTo = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(sec, durationSec || sec));
    void v.play().catch(() => { /* autoplay may be blocked */ });
  }, [durationSec]);

  // Sprint 9-E: fire-and-forget replay_clicked event. Records the segment
  // range + matched concept so the heuristic can flag struggle. Failures
  // are silently swallowed — the seek must never block on telemetry.
  const recordReplay = useCallback(
    (seg: ReplaySegment, matched: MatchedConcept | null) => {
      if (!matched) return;
      void fetch('/api/learning/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lectureJobId,
          conceptId: matched.id,
          conceptName: matched.name,
          eventType: 'replay_clicked',
          metadata: { segmentStart: seg.start, segmentEnd: seg.end },
        }),
      }).catch(() => { /* swallow */ });
    },
    [lectureJobId],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <header className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Interactive Lecture</span>
        <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
        {durationSec > 0 && (
          <p className="text-sm text-slate-500">{formatTime(durationSec)} · ask anything below</p>
        )}
      </header>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LecturePlayer ref={videoRef} videoUrl={videoUrl} />
        </div>
        <div className="lg:col-span-1">
          <AskExplanationPanel
            lectureJobId={lectureJobId}
            onSeek={seekTo}
            onReplay={recordReplay}
          />
        </div>
      </div>
    </div>
  );
}

// ─── <LecturePlayer /> ─────────────────────────────────────────────────

const LecturePlayer = forwardRef<HTMLVideoElement, { videoUrl: string }>(
  function LecturePlayer({ videoUrl }, ref) {
    return (
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
        <video
          ref={ref}
          src={videoUrl}
          controls
          className="w-full aspect-video bg-black"
          preload="metadata"
        />
      </div>
    );
  },
);

// ─── <AskExplanationPanel /> ───────────────────────────────────────────

function AskExplanationPanel({
  lectureJobId,
  onSeek,
  onReplay,
}: {
  lectureJobId: string;
  onSeek: (sec: number) => void;
  onReplay: (seg: ReplaySegment, matched: MatchedConcept | null) => void;
}) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);

  const submit = useCallback(async () => {
    const trimmed = q.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/lectures/${lectureJobId}/query`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ q: trimmed, phrase: true }),
      });
      const text = await res.text();
      if (!res.ok) {
        let msg = `query failed (${res.status})`;
        try { msg = JSON.parse(text)?.error || msg; } catch { /* keep msg */ }
        throw new Error(msg);
      }
      const body: QueryResponse = JSON.parse(text);
      setHistory((h) => [{ q: trimmed, response: body, ts: Date.now() }, ...h]);
      setQ('');
    } catch (e: any) {
      setErr(e?.message || 'query failed');
    } finally {
      setBusy(false);
    }
  }, [q, busy, lectureJobId]);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3 h-full flex flex-col">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">Ask this lecture</h2>
        <p className="text-xs text-slate-500 mt-0.5">Grounded in timestamps · formulas · notes</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          placeholder='e.g. "What is resistance?"'
          maxLength={500}
          disabled={busy}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !q.trim()}
          className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? '...' : 'Ask'}
        </button>
      </div>

      {err && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-300">
          {err}
        </div>
      )}

      <QueryHistoryList items={history} onSeek={onSeek} onReplay={onReplay} />
    </div>
  );
}

// ─── <QueryHistoryList /> ──────────────────────────────────────────────

function QueryHistoryList({
  items,
  onSeek,
  onReplay,
}: {
  items: QueryHistoryItem[];
  onSeek: (sec: number) => void;
  onReplay: (seg: ReplaySegment, matched: MatchedConcept | null) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-xs text-slate-600 italic mt-2">No questions yet.</div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
      {items.map((it) => (
        <ResponseCard key={it.ts} item={it} onSeek={onSeek} onReplay={onReplay} />
      ))}
    </div>
  );
}

// ─── <ResponseCard /> ──────────────────────────────────────────────────

function ResponseCard({
  item,
  onSeek,
  onReplay,
}: {
  item: QueryHistoryItem;
  onSeek: (sec: number) => void;
  onReplay: (seg: ReplaySegment, matched: MatchedConcept | null) => void;
}) {
  const r = item.response;
  return (
    <div className="bg-slate-950/60 rounded-lg border border-slate-800 p-3 space-y-2">
      <div className="text-xs text-slate-500">
        <span className="text-slate-400">Q:</span> {item.q}
        <span className="ml-2 text-[10px] text-slate-600">
          {r.intent} · conf {r.confidence.toFixed(2)}
          {r.cached && <span className="ml-1 text-emerald-500">· cached</span>}
        </span>
      </div>

      {r.matchedConcept && (
        <div className="text-xs text-slate-400">
          <span className="text-slate-500">concept:</span>{' '}
          <span className="text-emerald-400 font-medium">{r.matchedConcept.name}</span>
        </div>
      )}

      {r.answer ? (
        <p className="text-sm text-slate-100 leading-snug">{r.answer}</p>
      ) : r.matchedConcept ? (
        <p className="text-sm text-slate-200 leading-snug">{r.matchedConcept.definition}</p>
      ) : (
        <p className="text-sm text-slate-400 italic">No direct match — see lecture-level recap below.</p>
      )}

      {r.phraseError && (
        <div className="text-[10px] text-amber-400">
          phrasing unavailable: {r.phraseError}
        </div>
      )}

      <ReplayTimelineChips
        segments={r.replaySegments}
        onSeek={onSeek}
        onReplay={(seg) => onReplay(seg, r.matchedConcept)}
      />

      {r.formulas.length > 0 && <FormulaCard formulas={r.formulas} />}

      {r.relatedNotes.length > 0 && <NotesCard notes={r.relatedNotes} />}
    </div>
  );
}

// ─── <ReplayTimelineChips /> ───────────────────────────────────────────

function ReplayTimelineChips({
  segments,
  onSeek,
  onReplay,
}: {
  segments: ReplaySegment[];
  onSeek: (sec: number) => void;
  onReplay: (seg: ReplaySegment) => void;
}) {
  if (segments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {segments.map((seg, i) => (
        <button
          key={`${seg.start}-${seg.end}-${i}`}
          type="button"
          onClick={() => { onReplay(seg); onSeek(seg.start); }}
          className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 inline-flex items-center gap-1"
          title={`Replay ${formatTime(seg.start)} – ${formatTime(seg.end)}`}
        >
          <span className="text-emerald-400">▶</span>
          {formatTime(seg.start)}–{formatTime(seg.end)}
        </button>
      ))}
    </div>
  );
}

// ─── <FormulaCard /> ───────────────────────────────────────────────────

function FormulaCard({ formulas }: { formulas: string[] }) {
  return (
    <div className="bg-slate-900/80 border border-cyan-500/20 rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-1">Formulas</div>
      <ul className="space-y-0.5">
        {formulas.map((f, i) => (
          <li key={`${f}-${i}`} className="text-sm font-mono text-cyan-100">{f}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── <NotesCard /> ─────────────────────────────────────────────────────

function NotesCard({ notes }: { notes: Array<{ idx: number; text: string }> }) {
  return (
    <div className="bg-slate-900/80 border border-slate-700/60 rounded-md p-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Related notes</div>
      <ul className="space-y-1">
        {notes.slice(0, 3).map((n) => (
          <li key={n.idx} className="text-xs text-slate-300">
            <span className="text-slate-600 mr-1">#{n.idx}</span>{n.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── helpers ───────────────────────────────────────────────────────────

function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}
