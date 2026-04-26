import { createClient } from '@/lib/supabase-server';

export default async function SourcesPage() {
  const supabase = await createClient();
  const { data: sources } = await supabase.from('government_sources').select('*');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">Government Sources</h1>
        <p className="text-slate-400">Latest PIB press releases, ARC reports, and Lok Sabha questions.</p>
      </div>
      <div className="space-y-3">
        {sources && sources.length > 0 ? sources.map((s: any) => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">{s.source_type}</span>
              <span className="text-xs text-slate-500">{new Date(s.published_at).toLocaleDateString()}</span>
            </div>
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-slate-100 hover:text-emerald-400 transition">{s.title}</a>
            <p className="text-xs text-slate-400">{s.summary}</p>
          </div>
        )) : <div className="text-center text-slate-500 py-8">No government sources ingested yet. Admin can add sources via /admin/sources.</div>}
      </div>
    </div>
  );
}
