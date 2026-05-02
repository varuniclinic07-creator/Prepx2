import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { Panel } from './Panel';
import { Debrief } from './Debrief';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SessionRow {
  id: string;
  user_id: string;
  topic_focus: string | null;
  status: 'in_progress' | 'debrief_pending' | 'debriefed' | 'abandoned';
  total_score: number;
  started_at: string;
  ended_at: string | null;
}

interface TurnRow {
  id: string;
  turn_index: number;
  judge: 'chairperson' | 'expert' | 'behavioural';
  question: string;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
}

interface DebriefRow {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  scene_spec: any;
  render_status: string;
}

export default async function InterviewSessionPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/login?next=/interview/${id}`);

  const { data: session } = await sb
    .from('interview_sessions')
    .select('id, user_id, topic_focus, status, total_score, started_at, ended_at')
    .eq('id', id)
    .maybeSingle();
  if (!session) notFound();
  const s = session as SessionRow;

  const { data: turns } = await sb
    .from('interview_turns')
    .select('id, turn_index, judge, question, user_answer, score, feedback')
    .eq('session_id', id)
    .order('turn_index', { ascending: true })
    .order('judge', { ascending: true });

  const turnRows = (turns ?? []) as TurnRow[];

  let debrief: DebriefRow | null = null;
  if (s.status === 'debriefed') {
    const { data: dRow } = await sb
      .from('interview_debriefs')
      .select('id, summary, strengths, weaknesses, scene_spec, render_status')
      .eq('session_id', id)
      .maybeSingle();
    debrief = (dRow as DebriefRow | null) ?? null;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">
            Interview {s.topic_focus ? `· ${s.topic_focus}` : ''}
          </h1>
          <p className="text-xs text-slate-500">
            Started {new Date(s.started_at).toLocaleString()} · Status: {s.status}
          </p>
        </div>
        <Link href="/interview" className="text-sm text-slate-400 hover:text-slate-200">← Back</Link>
      </header>

      {s.status === 'in_progress' && (
        <Panel sessionId={s.id} turns={turnRows} />
      )}

      {s.status === 'debrief_pending' && (
        <DebriefPending />
      )}

      {s.status === 'debriefed' && debrief && (
        <Debrief
          totalScore={s.total_score}
          turns={turnRows}
          summary={debrief.summary}
          strengths={debrief.strengths || []}
          weaknesses={debrief.weaknesses || []}
          sceneSpec={debrief.scene_spec}
        />
      )}

      {s.status === 'abandoned' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-300">This interview was abandoned without any answers — nothing to debrief.</p>
        </div>
      )}
    </div>
  );
}

function DebriefPending() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent"></div>
      <p className="text-slate-300">Generating your 3D-VFX debrief…</p>
      <p className="text-xs text-slate-500">The judges are scoring your answers and rendering the scene. This page auto-refreshes.</p>
      <meta httpEquiv="refresh" content="6" />
    </div>
  );
}
