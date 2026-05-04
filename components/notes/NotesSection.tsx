'use client';

// Sprint 6 S6-2: wrapper for the 3D notes surface. Owns the notes state,
// debounced autosave, and toolbar (add / export PDF / count).

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import type { Note3DRow, NoteColor } from '@/components/3d/Notes3D';

const Notes3D = dynamic(
  () => import('@/components/3d/Notes3D').then((m) => m.Notes3D),
  { ssr: false, loading: () => <div className="p-6 text-sm text-slate-500">Loading 3D notes…</div> },
);

export interface NotesSectionProps {
  topicId: string;
  topicTitle: string;
  initialNotes: Note3DRow[];
}

export function NotesSection({ topicId, topicTitle, initialNotes }: NotesSectionProps) {
  const [notes, setNotes] = useState<Note3DRow[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Debounced PATCH per-note: collapses rapid edits into one server call.
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const queuePatch = useCallback((noteId: string, patch: Record<string, unknown>) => {
    const timers = patchTimers.current;
    const existing = timers.get(noteId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/topic/${topicId}/notes/${noteId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (data?.note) {
          setNotes((cur) => cur.map((n) => (n.id === noteId ? { ...n, ...data.note } : n)));
        }
      } catch (err: any) {
        toast.error(`Save failed: ${err?.message || 'unknown'}`);
      }
    }, 450);
    timers.set(noteId, t);
  }, [topicId]);

  useEffect(() => () => {
    for (const t of patchTimers.current.values()) clearTimeout(t);
    patchTimers.current.clear();
  }, []);

  const handlePatch = useCallback((id: string, patch: { content?: string; color?: NoteColor; position?: { x: number; y: number; z: number } }) => {
    // Optimistic local update so the 3D scene reflects the change immediately.
    setNotes((cur) => cur.map((n) => {
      if (n.id !== id) return n;
      const next = { ...n };
      if (patch.content !== undefined) next.content = patch.content;
      if (patch.color !== undefined) next.color = patch.color;
      if (patch.position) {
        if (patch.position.x !== undefined) next.position_x = patch.position.x;
        if (patch.position.y !== undefined) next.position_y = patch.position.y;
        if (patch.position.z !== undefined) next.position_z = patch.position.z;
      }
      return next;
    }));
    queuePatch(id, patch);
  }, [queuePatch]);

  const handleDelete = useCallback(async (id: string) => {
    const prev = notes;
    setNotes((cur) => cur.filter((n) => n.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
    try {
      const res = await fetch(`/api/topic/${topicId}/notes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('Note deleted');
    } catch (err: any) {
      setNotes(prev);
      toast.error(`Delete failed: ${err?.message || 'unknown'}`);
    }
  }, [notes, topicId]);

  const handleAdd = useCallback(async () => {
    setBusy(true);
    try {
      // Lay out new cards in a loose grid so they don't overlap.
      const idx = notes.length;
      const cols = 4;
      const x = ((idx % cols) - (cols - 1) / 2) * 3.0;
      const y = Math.floor(idx / cols) * -1.9;
      const res = await fetch(`/api/topic/${topicId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '',
          position: { x, y, z: 0 },
          color: 'primary',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data?.note) {
        setNotes((cur) => [...cur, data.note as Note3DRow]);
        setSelectedId(data.note.id);
      }
    } catch (err: any) {
      toast.error(`Add failed: ${err?.message || 'unknown'}`);
    } finally {
      setBusy(false);
    }
  }, [notes.length, topicId]);

  const handleExport = useCallback(() => {
    window.open(`/api/topic/${topicId}/notes/export`, '_blank');
  }, [topicId]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between border-t border-slate-800 pt-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">3D Notes</h2>
          <p className="text-xs text-slate-500">
            Your notes for <span className="text-slate-300">{topicTitle}</span> as cards in 3D space.
            Click a card to edit · drag to rotate · scroll to zoom.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">
            {notes.length} note{notes.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={handleExport}
            disabled={notes.length === 0}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={busy}
            className="rounded-lg bg-amber-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
          >
            {busy ? 'Adding…' : '+ Add note'}
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900" style={{ height: 520 }}>
        <Notes3D
          notes={notes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onPatch={handlePatch}
          onDelete={handleDelete}
        />
      </div>
    </section>
  );
}
