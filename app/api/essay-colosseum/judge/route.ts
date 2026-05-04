import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { awardCoins } from '@/lib/coins';
import { z } from 'zod';

const JudgeSchema = z.object({
  submission_id: z.string().uuid(),
  score_structure: z.number().int().min(1).max(10).optional(),
  score_argument: z.number().int().min(1).max(10).optional(),
  score_clarity: z.number().int().min(1).max(10).optional(),
  score_overall: z.number().int().min(1).max(10),
  feedback: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const parsed = JudgeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(e => e.message).join(', ') }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: sub, error: subErr } = await supabase
      .from('essay_colosseum_submissions')
      .select('id, match_id, user_id')
      .eq('id', parsed.data.submission_id)
      .single();
    if (subErr || !sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    if (sub.user_id === user.id) return NextResponse.json({ error: 'Cannot judge your own submission' }, { status: 403 });

    const { error: insErr } = await supabase.from('essay_peer_judgments').insert({
      submission_id: sub.id,
      match_id: sub.match_id,
      judge_id: user.id,
      score_structure: parsed.data.score_structure ?? null,
      score_argument: parsed.data.score_argument ?? null,
      score_clarity: parsed.data.score_clarity ?? null,
      score_overall: parsed.data.score_overall,
      feedback: parsed.data.feedback ?? null,
    });
    if (insErr) {
      const status = insErr.code === '23505' ? 409 : 403;
      return NextResponse.json({ error: insErr.message }, { status });
    }

    await awardCoins(supabase, user.id, 25, 'Peer-judged an essay', `judge-${sub.id}-${user.id}`);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
