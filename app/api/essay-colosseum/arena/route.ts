import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Lists closed matches the user did NOT participate in, with both submissions, plus
// the user's own already-judged submission_ids so the UI can hide them.
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: matches, error: mErr } = await supabase
      .from('essay_colosseum_matches')
      .select('id, topic, initiator_id, opponent_id, completed_at')
      .eq('status', 'closed')
      .neq('initiator_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(20);
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

    const matchesNotMine = (matches || []).filter(m => m.opponent_id !== user.id);
    if (matchesNotMine.length === 0) return NextResponse.json({ matches: [] });

    const matchIds = matchesNotMine.map(m => m.id);

    const { data: subs, error: sErr } = await supabase
      .from('essay_colosseum_submissions')
      .select('id, match_id, user_id, essay_text, word_count, scores')
      .in('match_id', matchIds);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const { data: alreadyJudged } = await supabase
      .from('essay_peer_judgments')
      .select('submission_id')
      .eq('judge_id', user.id)
      .in('match_id', matchIds);
    const judgedIds = new Set((alreadyJudged || []).map(j => j.submission_id));

    const out = matchesNotMine.map(m => ({
      ...m,
      submissions: (subs || [])
        .filter(s => s.match_id === m.id)
        .map(s => ({ ...s, already_judged: judgedIds.has(s.id) })),
    }));

    return NextResponse.json({ matches: out });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
