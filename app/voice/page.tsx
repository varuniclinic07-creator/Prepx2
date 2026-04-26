'use client';

import { useState, useEffect, useRef } from 'react';
import { parseIntent, executeIntent, VoiceSessionState } from '@/lib/voice-session';

interface LogEntry {
  id: number;
  speaker: 'user' | 'ai';
  text: string;
  ts: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function VoicePage() {
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const processTranscript = async (text: string) => {
    if (!text.trim()) { setState('idle'); return; }
    const intent = parseIntent(text);
    const response = await executeIntent(intent, '');
    setAiResponse(response);
    addLog('user', text);
    addLog('ai', response);
    speak(response);
    setState('speaking');
    setTimeout(() => setState('idle'), response.length * 60);
  };

  const startListening = () => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'en-IN';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = () => setState('listening');
    rec.onresult = (e: any) => {
      const t = Array.from(e.results)
        .map((r: any) => r[0].transcript)
        .join('');
      setTranscript(t);
      transcriptRef.current = t;
    };
    rec.onerror = (e: any) => {
      console.error('[Voice]', e.error);
      setState('idle');
    };
    rec.onend = () => {
      const t = (transcriptRef.current || '').trim();
      if (!/prep[xX]/i.test(t)) {
        setState('idle');
        setTranscript('');
        addLog('ai', "Say 'PrepX' to activate.");
        return;
      }
      setState('thinking');
      processTranscript(t);
    };
    recognitionRef.current = rec;
    rec.start();
    setTimeout(() => { try { rec.stop(); } catch {} }, 5000);
  };

  const addLog = (speaker: 'user' | 'ai', text: string) => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), speaker, text, ts: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }]);
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (voice) u.voice = voice;
    u.lang = 'en-IN';
    u.rate = 0.9;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-100">🎙️ Voice-First</h1>
        <p className="text-sm text-slate-400">Tap the mic and speak</p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={startListening}
          disabled={state !== 'idle'}
          className={`w-24 h-24 rounded-full border-2 flex items-center justify-center text-3xl transition ${
            state === 'listening'
              ? 'bg-red-500/20 border-red-500 animate-pulse'
              : state === 'thinking'
              ? 'bg-amber-500/20 border-amber-500'
              : state === 'speaking'
              ? 'bg-emerald-500/20 border-emerald-500'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
          }`}
        >
          {state === 'listening' ? '🔴' : state === 'thinking' ? '💭' : state === 'speaking' ? '🔊' : '🎙️'}
        </button>
      </div>

      {state === 'listening' && (
        <div className="flex justify-center gap-1 h-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}

      {transcript && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1">You said</div>
          <p className="text-sm text-slate-200">{transcript}</p>
        </div>
      )}

      {aiResponse && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-xs text-emerald-500 mb-1">PrepX AI</div>
          <p className="text-sm text-emerald-200">{aiResponse}</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Conversation</h2>
          {logs.map(log => (
            <div key={log.id} className={`flex ${log.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                log.speaker === 'user'
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/20'
              }`}>
                <p>{log.text}</p>
                <div className={`text-[10px] mt-1 ${log.speaker === 'user' ? 'text-slate-500' : 'text-emerald-500'}`}>{log.ts}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
