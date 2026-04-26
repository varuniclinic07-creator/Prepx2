'use client';

import { useState } from 'react';
import Link from 'next/link';

interface MnemonicRecord {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

export default function MnemonicsPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ mnemonic_text: string; explanation: string; topic: string } | null>(null);
  const [error, setError] = useState('');
  const [shared, setShared] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/mnemonics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const shareText = result
    ? `🧠 PrepX Mnemonic for "${result.topic}":\n\n${result.mnemonic_text}\n\n${result.explanation}\n\nShare yours: #PrepXUPSC`
    : '';

  const handleCopy = async () => {
    if (!shareText) return;
    await navigator.clipboard.writeText(shareText);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!shareText) return;
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (!shareText || !navigator.share) return;
    try {
      await navigator.share({
        title: `Mnemonic for ${result?.topic}`,
        text: shareText,
      });
    } catch {}
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">🧠 AI Mnemonic Generator</h1>
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-200 transition">← Back</Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <label className="block text-sm font-medium text-slate-300">Enter a UPSC topic or list</label>
        <input
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="e.g. Fundamental Rights, Schedules of Constitution, PMs of India..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          onKeyDown={e => e.key === 'Enter' && handleGenerate()}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            'Generate Mnemonic'
          )}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mnemonic</h2>
            <p className="text-3xl font-bold text-emerald-400 leading-tight">{result.mnemonic_text}</p>
          </div>
          {result.explanation && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Explanation</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{result.explanation}</p>
            </div>
          )}

          {/* Placeholder image area (future: DALL-E) */}
          <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl h-40 flex items-center justify-center">
            <span className="text-sm text-slate-500">🖼️ AI-generated meme image coming soon</span>
          </div>

          {/* Share buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded-lg text-sm transition"
            >
              {shared ? '✅ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={handleWhatsApp}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg text-sm transition"
            >
              💬 WhatsApp
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="px-4 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:text-violet-300 rounded-lg text-sm transition"
              >
                🔗 Share
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
