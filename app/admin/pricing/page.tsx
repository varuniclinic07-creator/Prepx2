import { createClient } from '@/lib/supabase-server';

export default async function AdminPricingPage() {
  const supabase = createClient();
  const { data: subs } = await supabase.from('subscriptions').select('*');
  const { data: flags } = await supabase.from('feature_flags').select('*');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Pricing & Subscriptions</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['inactive','active','canceled','past_due'].map(st => {
          const count = subs?.filter((s: any) => s.status === st).length ?? 0;
          return (
            <div key={st} className={`bg-slate-900 border rounded-lg p-4 text-center ${count > 0 ? 'border-emerald-500/20' : 'border-slate-800'}`}>
              <div className="text-2xl font-bold text-emerald-400">{count}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{st}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left"><tr><th className="px-4 py-3">User ID</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Period End</th></tr></thead>
          <tbody className="divide-y divide-slate-800">
            {subs && subs.length > 0 ? subs.map((s: any) => (
              <tr key={s.user_id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{s.user_id?.slice(0,8)}...</td>
                <td className="px-4 py-3 text-slate-200">{s.plan}</td>
                <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${s.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{s.status}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '-'}</td>
              </tr>
            )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No subscriptions yet</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-100 mb-3">Feature Flags</h2>
        <div className="space-y-2">
          {flags && flags.map((f: any) => (
            <div key={f.flag_name} className="flex justify-between text-sm px-3 py-2 bg-slate-800/50 rounded-lg">
              <span className="text-slate-300">{f.flag_name}</span>
              <span className="text-emerald-400 font-medium">{f.enabled_for}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
