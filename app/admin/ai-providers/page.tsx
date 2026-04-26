'use client';

import { useState } from 'react';

const PROVIDERS = [
  { name: 'Ollama Cloud', tier: 1, env: '****', model: '****' },
  { name: 'Groq', tier: 2, env: '****', model: '****' },
  { name: '9router', tier: 3, env: '****', model: '****' },
  { name: 'NVIDIA', tier: 4, env: '****', model: '****' },
  { name: 'Kilo AI', tier: 5, env: '****', model: '****' },
];

export default function AiProvidersPage() {
  const [testResult, setTestResult] = useState('');

  const testProvider = async (provider: string) => {
    setTestResult(`Testing ${provider}...`);
    try {
      const res = await fetch('/api/test-ai', { method: 'POST', body: JSON.stringify({ provider }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setTestResult(`${provider}: ${data.ok ? '✅ OK' : '❌ FAIL'} — ${data.message || ''}`);
    } catch (e: any) {
      setTestResult(`${provider}: ❌ ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">AI Provider Status</h1>
      <div className="grid gap-4">
        {PROVIDERS.map(p => (
          <div key={p.name} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Tier {p.tier}</span>
                <span className="text-sm font-semibold text-slate-200">{p.name}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{p.env}</div>
              <div className="text-xs text-slate-400">Model: {p.model}</div>
            </div>
            <button onClick={() => testProvider(p.name)} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-bold rounded-lg transition">
              Test
            </button>
          </div>
        ))}
      </div>
      {testResult && <div className="text-sm text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-4">{testResult}</div>}
    </div>
  );
}
