'use client';

import { useState } from 'react';

export function RefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/rank/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) window.location.reload();
    } catch {}
    setRefreshing(false);
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="text-sm bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
    >
      {refreshing ? '⏳ Updating…' : '🔄 Refresh'}
    </button>
  );
}
