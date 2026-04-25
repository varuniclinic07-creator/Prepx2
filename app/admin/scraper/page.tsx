'use client';

import { useState } from 'react';
import { SOURCE_REGISTRY } from '@/lib/scraper/config';

export default function AdminScraperPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [sourceId, setSourceId] = useState('');

  const runScrape = async (id?: string) => {
    setLoading(true);
    setResult(id ? `Scraping ${id}...` : 'Running full pipeline...');
    try {
      const res = await fetch('/api/scrape/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: id || undefined, regenerateAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        const r = data.result;
        setResult(`Scraped: ${r.totalScraped} | Generated: ${r.totalGenerated} | Updated: ${r.totalUpdated}\n${r.errors.length > 0 ? 'Errors:\n' + r.errors.join('\n') : ''}`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (e: any) {
      setResult(`Failed: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Content Scraper & AI Pipeline</h1>
      <p className="text-slate-400">Scrape 11 UPSC sources, extract PDFs, generate EN+HI content via multi-tier AI fallback.</p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <label className="text-sm text-slate-400">Select Source</label>
        <select
          value={sourceId}
          onChange={e => setSourceId(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100"
        >
          <option value="">All Sources (Full Pipeline)</option>
          {SOURCE_REGISTRY.filter(s => s.enabled).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            onClick={() => runScrape(sourceId || undefined)}
            disabled={loading}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-lg transition"
          >
            {loading ? 'Running...' : sourceId ? `Run ${sourceId}` : 'Run Full Pipeline'}
          </button>
        </div>
      </div>

      {result && (
        <pre className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 whitespace-pre-wrap">{result}</pre>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider mb-3">Source Registry</h3>
        <div className="space-y-2">
          {SOURCE_REGISTRY.filter(s => s.enabled).map(s => (
            <div key={s.id} className="flex justify-between text-sm px-3 py-2 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">{s.name}</span>
              <span className={`text-xs font-medium ${s.type === 'playwright' ? 'text-amber-400' : 'text-emerald-400'}`}>{s.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
