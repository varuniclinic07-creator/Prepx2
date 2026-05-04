import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('essay_colosseum_leaderboard')
      .select('user_id, email, wins, matches_played, avg_peer_score, peer_judgments_received, last_match_at')
      .gt('matches_played', 0)
      .order('wins', { ascending: false })
      .order('avg_peer_score', { ascending: false })
      .limit(50);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ leaderboard: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
