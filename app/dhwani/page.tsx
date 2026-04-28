import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import DownloadDhwani from './DownloadDhwani';
import AudioPlayer from './AudioPlayer';

export default async function DhwaniPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data } = await supabase
    .from('daily_dhwani')
    .select('*')
    .eq('date', today)
    .single();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">🎙️ Daily Dhwani</h1>
        <span className="text-sm text-slate-400">
          {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      {data ? (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-emerald-400">
                Current Affairs Recap — {data.gs_paper || 'General Studies'}
              </h2>
              <DownloadDhwani script={data.script_text || ''} date={today} />
            </div>

            <AudioPlayer scriptText={data.script_text || ''} />

            <div className="space-y-3">
              {(data.stories || []).map((story: any, idx: number) => (
                <div key={idx} className="bg-slate-800/50 rounded-lg p-4 border-l-4 border-cyan-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      GS Map
                    </span>
                    <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                      {story.gs_paper || 'General Studies'}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">{story.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">Source: {story.source}</p>
                  <p className="text-sm text-slate-300 mt-2 leading-relaxed">{story.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Full Script
            </h2>
            <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">
              {data.script_text}
            </pre>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400 mb-4">Today&apos;s Daily Dhwani hasn&apos;t been generated yet.</p>
          <Link
            href="/admin/content"
            className="inline-block px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-sm transition"
          >
            Generate from Admin
          </Link>
        </div>
      )}
    </div>
  );
}
