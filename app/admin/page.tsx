import { createClient } from '@/lib/supabase-server';

export default async function AdminPage() {
  const supabase = await createClient();
  const [topics, quizzes, users] = await Promise.all([
    supabase.from('topics').select('id', { count: 'exact' }),
    supabase.from('quizzes').select('id', { count: 'exact' }),
    supabase.from('users').select('id', { count: 'exact' }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Topics" value={topics.count ?? 0} />
        <Stat label="Quizzes" value={quizzes.count ?? 0} />
        <Stat label="Users" value={users.count ?? 0} />
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Quick Actions</h2>
        <div className="flex gap-3">
          <a href="/admin/content" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg transition">Generate Content</a>
          <a href="/admin/quizzes" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-lg transition">Generate Quizzes</a>
          <a href="/admin/ai-providers" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-bold rounded-lg transition">AI Provider Status</a>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center">
      <div className="text-3xl font-bold text-emerald-400">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
    </div>
  );
}
