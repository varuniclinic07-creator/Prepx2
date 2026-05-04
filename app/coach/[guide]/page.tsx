// /coach/[guide] — chat surface for one of the three teacher guides
// (prelims | mains | interview). Loads (or creates) the active consultation
// for this user + guide and hydrates the ChatPanel with prior turns.

import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { SCOPE_FILTER, type GuideType } from '@/lib/agents/teacher-coach';
import { ChatPanel, type ChatTurn } from '@/components/coach/ChatPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GUIDE_META: Record<GuideType, { title: string; persona: string; subtitle: string; accent: string }> = {
  prelims: {
    title: 'Prelims Guide',
    persona: 'PrelimsGuide',
    subtitle: 'GS Paper 1 + 2 · MCQ elimination · option-thinking · last-mile triage',
    accent: 'from-amber-400/20 to-orange-500/20 ring-amber-400/40',
  },
  mains: {
    title: 'Mains Guide',
    persona: 'MainsGuide',
    subtitle: 'GS 1-4 + Essay · structure · examples · ARC/PIB citations',
    accent: 'from-cyan-400/20 to-sky-500/20 ring-cyan-400/40',
  },
  interview: {
    title: 'Interview Guide',
    persona: 'InterviewGuide',
    subtitle: 'DAF · personality · SAR framework · governance · opinion balance',
    accent: 'from-rose-400/20 to-pink-500/20 ring-rose-400/40',
  },
};

export default async function CoachPage({ params }: { params: Promise<{ guide: string }> }) {
  const { guide } = await params;
  if (!['prelims', 'mains', 'interview'].includes(guide)) notFound();
  const guideType = guide as GuideType;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/coach/${guideType}`);

  // Get-or-create active consultation.
  let { data: consultation } = await supabase
    .from('teacher_consultations')
    .select('id, guide_type, scope_filter, status, created_at, updated_at')
    .eq('guide_type', guideType)
    .eq('status', 'active')
    .maybeSingle();

  if (!consultation) {
    const { data: created } = await supabase.from('teacher_consultations').insert({
      user_id: user.id,
      guide_type: guideType,
      scope_filter: SCOPE_FILTER[guideType],
    }).select('id, guide_type, scope_filter, status, created_at, updated_at').single();
    consultation = created;
  }

  if (!consultation) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-bold text-slate-100">Could not open the consultation</h1>
        <p className="mt-2 text-sm text-slate-400">Please reload the page.</p>
      </div>
    );
  }

  const { data: turns } = await supabase
    .from('teacher_consultation_turns')
    .select('id, role, message, metadata, created_at')
    .eq('consultation_id', consultation.id)
    .order('created_at', { ascending: true });

  const meta = GUIDE_META[guideType];
  const initialTurns = (turns ?? []) as ChatTurn[];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:py-12">
      <header className={`rounded-2xl bg-gradient-to-br ${meta.accent} ring-1 px-6 py-5`}>
        <div className="text-xs uppercase tracking-[0.18em] text-slate-300">{meta.persona}</div>
        <h1 className="mt-1 text-3xl font-bold text-white">{meta.title}</h1>
        <p className="mt-1 text-sm text-slate-200">{meta.subtitle}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SCOPE_FILTER[guideType].slice(0, 6).map((tag) => (
            <span key={tag} className="rounded-full bg-slate-950/40 px-2.5 py-0.5 text-[11px] text-slate-200">
              {tag}*
            </span>
          ))}
        </div>
      </header>

      <ChatPanel
        guide={guideType}
        consultationId={consultation.id}
        initialTurns={initialTurns}
      />

      <p className="text-xs text-slate-500">
        {`Tip: when you say "I don't understand…" or "show me…", your guide will spin up a 3D topic-imagination video in the background. Check `}
        <a href="/imagine" className="text-amber-300 hover:underline">/imagine</a> in a minute.
      </p>
    </div>
  );
}
