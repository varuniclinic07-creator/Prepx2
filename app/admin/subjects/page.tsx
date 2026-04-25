import { createClient } from '@/lib/supabase-server';
import { ALL_SUBJECTS } from '@/lib/agents/subjects';
import Link from 'next/link';

export default async function AdminSubjectsPage() {
  const supabase = createClient();

  // Count topics per subject
  const subjectCounts: Record<string, number> = {};
  for (const s of ALL_SUBJECTS) {
    const { count } = await supabase.from('topics').select('id', { count: 'exact' }).eq('subject', s.id);
    subjectCounts[s.id] = count ?? 0;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">All 19 UPSC Subjects</h1>
          <p className="text-slate-400 mt-1">Subject registry with topic coverage across all General Studies and CSAT papers.</p>
        </div>
        <Link href="/admin/content" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition">
          Generate Content
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ALL_SUBJECTS.map(s => {
          const count = subjectCounts[s.id] ?? 0;
          const hasContent = count >= s.totalTopics;
          return (
            <div key={s.id} className={`bg-slate-900 border rounded-xl p-5 space-y-3 ${hasContent ? 'border-emerald-500/20' : 'border-slate-800'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-100">{s.displayName}</h3>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${hasContent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {count}/{s.totalTopics}
                </span>
              </div>
              <p className="text-xs text-slate-500">GS Paper {s.gsPaper || 'CSAT'} · Prefix {s.syllabusPrefix}</p>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${hasContent ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                  style={{ width: `${Math.min(100, (count / Math.max(1, s.totalTopics)) * 100)}%` }}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Link href={`/admin/content?subject=${s.id}`} className="flex-1 text-center text-xs px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
                  Generate
                </Link>
                <Link href={`/admin/quizzes?subject=${s.id}`} className="flex-1 text-center text-xs px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition">
                  Quizzes
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
