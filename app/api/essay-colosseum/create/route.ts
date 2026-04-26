import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ topic: z.string().min(1).max(10000), opponent_email: z.string().email().optional() });

export async function POST(request: NextRequest) {
  try {
    let raw: unknown;
    try { raw = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { topic, opponent_email } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let opponentId = null;
    if (opponent_email) {
      const { data: opp } = await supabase.from('users').select('id').eq('email', opponent_email).single();
      opponentId = opp?.id || null;
    }

    const { data, error } = await supabase.from('essay_colosseum_matches')
      .insert({ topic: topic.trim(), initiator_id: user.id, opponent_id: opponentId, status: 'open', ai_verdict: {} })
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ match: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
