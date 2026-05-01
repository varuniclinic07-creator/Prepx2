'use client';

import { useEffect, useRef, useState } from 'react';

type Chapter = { title: string; start: number };
type Note = { id: string; time_seconds: number; body: string; created_at: string };
type Qa = { id: string; time_seconds: number; question: string; answer: string; created_at: string };

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function LecturePlayer({
  lectureId,
  videoUrl,
  captionsUrl,
  chapters,
  durationSeconds,
  signedIn,
}: {
  lectureId: string;
  videoUrl: string;
  captionsUrl: string | null;
  chapters: Chapter[];
  durationSeconds: number;
  signedIn: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [tab, setTab] = useState<'notes' | 'qa'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [qa, setQa] = useState<Qa[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [qaDraft, setQaDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    fetch(`/api/lectures/${lectureId}/notes`).then(r => r.json()).then(d => {
      if (Array.isArray(d?.notes)) setNotes(d.notes);
    }).catch(() => {});
    fetch(`/api/lectures/${lectureId}/qa`).then(r => r.json()).then(d => {
      if (Array.isArray(d?.items)) setQa(d.items);
    }).catch(() => {});
  }, [lectureId, signedIn]);

  function seekTo(seconds: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = seconds;
    v.play().catch(() => {});
  }

  async function saveNote() {
    if (!noteDraft.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_seconds: Math.floor(currentTime), body: noteDraft.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setNotes(prev => [...prev, body.note].sort((a, b) => a.time_seconds - b.time_seconds));
      setNoteDraft('');
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  async function askQuestion() {
    if (!qaDraft.trim()) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/lectures/${lectureId}/qa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time_seconds: Math.floor(currentTime), question: qaDraft.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`);
      setQa(prev => [body.qa, ...prev]);
      setQaDraft('');
    } catch (e: any) {
      setErr(e?.message || 'Failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full aspect-video bg-black"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          >
            {captionsUrl && <track kind="subtitles" src={captionsUrl} default />}
          </video>
        </div>

        {chapters.length > 0 && (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
            <h2 className="text-sm font-semibold text-slate-200 mb-3">Chapters</h2>
            <ul className="space-y-1">
              {chapters.map((c, i) => (
                <li key={i}>
                  <button
                    onClick={() => seekTo(c.start)}
                    className="w-full text-left flex items-center gap-3 px-2 py-1.5 rounded hover:bg-slate-800/60 text-sm"
                  >
                    <span className="font-mono text-xs text-emerald-400 w-12">{fmt(c.start)}</span>
                    <span className="text-slate-200">{c.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {durationSeconds > 0 && (
          <p className="text-xs text-slate-500">
            Duration: {fmt(durationSeconds)} · Currently at {fmt(currentTime)}
          </p>
        )}
      </div>

      <aside className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="flex gap-1 border-b border-slate-800 -mx-4 px-4">
          <button onClick={() => setTab('notes')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'notes' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
            Notes ({notes.length})
          </button>
          <button onClick={() => setTab('qa')}
            className={`px-3 py-2 text-sm font-medium ${tab === 'qa' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}>
            Ask AI ({qa.length})
          </button>
        </div>

        {!signedIn && (
          <p className="text-xs text-slate-500">Sign in to take notes and ask questions about this lecture.</p>
        )}

        {signedIn && tab === 'notes' && (
          <>
            <div className="space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder={`Note at ${fmt(currentTime)}…`}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                maxLength={4000}
              />
              <button onClick={saveNote} disabled={busy || !noteDraft.trim()}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded text-sm">
                {busy ? 'Saving…' : 'Save note'}
              </button>
            </div>
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {notes.map((n) => (
                <li key={n.id} className="bg-slate-950/60 border border-slate-800 rounded p-2">
                  <button onClick={() => seekTo(n.time_seconds)} className="font-mono text-xs text-emerald-400 hover:underline">
                    {fmt(n.time_seconds)}
                  </button>
                  <p className="text-sm text-slate-200 mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
              {notes.length === 0 && <li className="text-xs text-slate-500">No notes yet.</li>}
            </ul>
          </>
        )}

        {signedIn && tab === 'qa' && (
          <>
            <div className="space-y-2">
              <textarea
                value={qaDraft}
                onChange={(e) => setQaDraft(e.target.value)}
                placeholder="Ask anything about what you just heard…"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-sm text-slate-100"
                maxLength={1000}
              />
              <button onClick={askQuestion} disabled={busy || !qaDraft.trim()}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-semibold rounded text-sm">
                {busy ? 'Thinking…' : 'Ask AI tutor'}
              </button>
            </div>
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {qa.map((q) => (
                <li key={q.id} className="bg-slate-950/60 border border-slate-800 rounded p-2">
                  <button onClick={() => seekTo(q.time_seconds)} className="font-mono text-xs text-cyan-400 hover:underline">
                    {fmt(q.time_seconds)}
                  </button>
                  <p className="text-sm text-slate-100 font-medium mt-1">Q: {q.question}</p>
                  <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{q.answer}</p>
                </li>
              ))}
              {qa.length === 0 && <li className="text-xs text-slate-500">No questions yet.</li>}
            </ul>
          </>
        )}

        {err && <p className="text-xs text-rose-400">{err}</p>}
      </aside>
    </div>
  );
}
