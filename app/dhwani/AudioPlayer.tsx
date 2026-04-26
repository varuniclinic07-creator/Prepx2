'use client';
import { useState } from 'react';

export default function AudioPlayer({ scriptText }: { scriptText: string }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateAudio = async () => {
    if (!scriptText) return;
    setLoading(true);
    try {
      const res = await fetch('/api/dhwani/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: scriptText.slice(0, 4000) }),
      });
      const data = await res.json();
      if (data.audio_base64) {
        setAudioUrl(`data:${data.mime_type};base64,${data.audio_base64}`);
      } else {
        alert(data.error || 'Audio generation failed');
      }
    } catch (e: any) {
      alert(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {audioUrl ? (
        <audio controls src={audioUrl} className="w-full" />
      ) : (
        <button
          onClick={generateAudio}
          disabled={loading}
          className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-sm transition"
        >
          {loading ? 'Generating Audio…' : '🔊 Generate Audio'}
        </button>
      )}
    </div>
  );
}
