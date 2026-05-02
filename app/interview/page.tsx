import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { StartInterviewForm } from './StartInterviewForm';

export const dynamic = 'force-dynamic';

const TOPIC_FOCUS_OPTIONS = [
  'General',
  'Polity',
  'Economy',
  'International Relations',
  'Environment & Ecology',
  'Science & Technology',
  'Ethics & Integrity',
  'Public Administration',
  'Sociology',
  'History',
  'Geography',
];

export default async function InterviewLandingPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login?next=/interview');

  const { data: sessions } = await sb
    .from('interview_sessions')
    .select('id, topic_focus, status, total_score, started_at, ended_at')
    .order('started_at', { ascending: false })
    .limit(10);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-500/20 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-slate-100">Live Interview Panel</h1>
        <p className="text-slate-400 mt-1">
          Three AI judges — Chairperson, Subject Expert, Behavioural Psychologist — take turns asking
          you questions. End the round to receive a 3D-VFX debrief with strengths, weaknesses, and
          per-judge scoring.
        </p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Start a new interview</h2>
        <StartInterviewForm topicFocusOptions={TOPIC_FOCUS_OPTIONS} />
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Recent sessions</h2>
        </div>
        {sessions && sessions.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-slate-800/50 text-slate-400 text-left">
              <tr>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Topic focus</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sessions.map(s => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-slate-400">{new Date(s.started_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-slate-200">{s.topic_focus || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      s.status === 'debriefed' ? 'bg-emerald-500/20 text-emerald-300' :
                      s.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-300' :
                      s.status === 'debrief_pending' ? 'bg-amber-500/20 text-amber-300' :
                      'bg-slate-700/40 text-slate-400'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{s.status === 'debriefed' ? `${s.total_score}` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/interview/${s.id}`} className="text-emerald-400 hover:underline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-10 text-center text-slate-500">No interviews yet — start one above.</div>
        )}
      </section>
    </div>
  );
}
