import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// AC-07: Create match: POST { topic, opponent_email } → create match row
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, opponent_email } = body;
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find opponent by email
    let opponentId = null;
    if (opponent_email) {
      const { data: opp } = await supabase.from('users').select('id').eq('email', opponent_email).single();
      opponentId = opp?.id || null;
    }

    const { data, error } = await supabase.from('essay_colosseum_matches')
      .insert({ topic: topic.trim(), initiator_id: user.id, opponent_id: opponentId, status: 'open', ai_verdict: {} })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ match: data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
