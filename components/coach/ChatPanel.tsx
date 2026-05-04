'use client';

// Sprint 6 S6-3: chat panel for /coach/[guide]. Posts user turn → server runs
// guide.coach() synchronously → both rows persisted to teacher_consultation_turns.
// On struggle signals an imagine-video is spawned in parallel.

import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { GuideType } from '@/lib/agents/teacher-coach';

export interface ChatTurn {
  id: string;
  role: 'user' | 'guide';
  message: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface ChatPanelProps {
  guide: GuideType;
  consultationId: string;
  initialTurns: ChatTurn[];
}

export function ChatPanel({ guide, consultationId, initialTurns }: ChatPanelProps) {
  const [turns, setTurns] = useState<ChatTurn[]>(initialTurns);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;
    setDraft('');
    setBusy(true);

    // Optimistic user turn.
    const optimisticId = `tmp-${Date.now()}`;
    const optimistic: ChatTurn = {
      id: optimisticId,
      role: 'user',
      message,
      created_at: new Date().toISOString(),
    };
    setTurns((cur) => [...cur, optimistic]);

    try {
      const res = await fetch(`/api/coach/${guide}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, consultationId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // Replace optimistic with persisted; append guide reply.
      startTransition(() => {
        setTurns((cur) => {
          const withoutOpt = cur.filter((t) => t.id !== optimisticId);
          const next: ChatTurn[] = [
            ...withoutOpt,
            { ...optimistic, id: `usr-${Date.now()}` },
          ];
          if (data.reply) next.push(data.reply as ChatTurn);
          return next;
        });
      });

      if (data?.imagineTaskId) {
        toast.success('3D imagine-video queued — check /imagine in a minute.');
      }
    } catch (err: any) {
      // Roll back optimistic.
      setTurns((cur) => cur.filter((t) => t.id !== optimisticId));
      setDraft(message);
      toast.error(`Failed: ${err?.message || 'unknown'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur">
      <div
        ref={scrollRef}
        className="max-h-[60vh] min-h-[320px] space-y-4 overflow-y-auto p-5"
      >
        {turns.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Say hi and ask anything within the syllabus scope. Your guide remembers
            this conversation across sessions.
          </div>
        )}
        {turns.map((t) => (
          <Bubble key={t.id} turn={t} guide={guide} />
        ))}
        {busy && (
          <div className="ml-2 inline-flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-xs text-slate-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" />
            <span>Guide is thinking…</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 border-t border-slate-800 p-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Ask your guide… (Shift+Enter for newline)"
          className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length === 0}
          className="rounded-lg bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ turn, guide }: { turn: ChatTurn; guide: GuideType }) {
  const isUser = turn.role === 'user';
  const meta = (turn.metadata ?? null) as { imagine_task_id?: string; imagine_hint?: { topicQuery?: string | null } } | null;
  const time = new Date(turn.created_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow ${
          isUser
            ? 'bg-amber-400/15 text-amber-50 ring-1 ring-amber-400/30'
            : 'bg-slate-800/80 text-slate-100 ring-1 ring-slate-700'
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-wider opacity-70">
          <span>{isUser ? 'You' : `${guide}-guide`}</span>
          <span>{time}</span>
        </div>
        <div className="mt-1 whitespace-pre-wrap leading-relaxed">{turn.message}</div>
        {!isUser && meta?.imagine_task_id && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] text-emerald-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            3D imagine-video queued{meta?.imagine_hint?.topicQuery ? ` for "${meta.imagine_hint.topicQuery}"` : ''}
          </div>
        )}
      </div>
    </div>
  );
}
