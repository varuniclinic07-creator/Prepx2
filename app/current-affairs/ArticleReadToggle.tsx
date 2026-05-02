'use client';

import { useState, useTransition } from 'react';
import { Check, Circle } from 'lucide-react';

type Props = {
  bundleId: string;
  articleId: string;
  initialRead: boolean;
};

export function ArticleReadToggle({ bundleId, articleId, initialRead }: Props) {
  const [isRead, setIsRead] = useState(initialRead);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    const next = !isRead;
    setIsRead(next); // optimistic

    startTransition(async () => {
      try {
        const res = await fetch('/api/current-affairs/read', {
          method: next ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bundleId, articleId }),
        });
        if (!res.ok) {
          setIsRead(!next); // rollback
          const body = await res.json().catch(() => ({}));
          setError(body?.error ?? `HTTP ${res.status}`);
        }
      } catch (e) {
        setIsRead(!next);
        setError(e instanceof Error ? e.message : 'Network error');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
          isRead
            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20'
            : 'bg-slate-800 text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700'
        }`}
        aria-pressed={isRead}
        aria-label={isRead ? 'Mark as unread' : 'Mark as read'}
      >
        {isRead ? <Check size={14} /> : <Circle size={14} />}
        {isRead ? 'Read' : 'Mark read'}
      </button>
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
    </div>
  );
}
