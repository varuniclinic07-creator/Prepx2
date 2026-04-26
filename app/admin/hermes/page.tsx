import { createClient } from '@/lib/supabase-server';
import { HERMES_STATES } from '@/lib/agents/hermes';

export default async function AdminHermesPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase.from('user_sessions').select('*');
  const { count: total } = await supabase.from('user_sessions').select('id', { count: 'exact' });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Hermes Monitor</h1>
      <p className="text-slate-400">Live session state tracking. {sessions?.length ?? 0} active sessions.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {HERMES_STATES.map(state => {
          const count = sessions?.filter((s: any) => s.session_state === state).length ?? 0;
          return (
            <div key={state} className={`bg-slate-900 border rounded-lg p-4 text-center ${count > 0 ? 'border-emerald-500/20' : 'border-slate-800'}`}>
              <div className="text-2xl font-bold text-emerald-400">{count}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{state}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-400 text-left">
            <tr>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Last Activity</th>
              <th className="px-4 py-3">Topic</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sessions && sessions.length > 0 ? sessions.map((s: any) => (
              <tr key={s.user_id} className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{s.user_id?.slice(0,8)}...</td>
                <td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${getStateBadge(s.session_state)}`}>{s.session_state}</span></td>
                <td className="px-4 py-3 text-slate-400 text-xs">{new Date(s.last_activity_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{s.current_topic_id?.slice(0,8) ?? '-'}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No active sessions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function getStateBadge(state: string) {
  switch (state) {
    case 'done': return 'bg-emerald-500/20 text-emerald-400';
    case 'feedback': return 'bg-cyan-500/20 text-cyan-400';
    case 'quizzing': return 'bg-amber-500/20 text-amber-400';
    case 'studying': return 'bg-blue-500/20 text-blue-400';
    case 'idle': return 'bg-slate-700 text-slate-400';
    default: return 'bg-slate-700 text-slate-400';
  }
}
