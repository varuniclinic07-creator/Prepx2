import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: squads, error } = await supabase
      .from('squads')
      .select('id, name, subject, created_by, invite_code');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: members } = await supabase.from('squad_members').select('squad_id, user_id');
    const { data: balances } = await supabase.from('user_balances').select('user_id, coins');

    const memberCounts: Record<string, number> = {};
    (members || []).forEach(m => { memberCounts[m.squad_id] = (memberCounts[m.squad_id] || 0) + 1; });

    const userCoins: Record<string, number> = {};
    (balances || []).forEach(b => { userCoins[b.user_id] = b.coins || 0; });

    const squadCoins: Record<string, number> = {};
    (members || []).forEach(m => {
      squadCoins[m.squad_id] = (squadCoins[m.squad_id] || 0) + (userCoins[m.user_id] || 0);
    });

    const leaderboard = (squads || []).map(s => ({
      id: s.id,
      name: s.name,
      subject: s.subject,
      members: memberCounts[s.id] || 0,
      totalCoins: squadCoins[s.id] || 0,
    })).sort((a, b) => b.totalCoins - a.totalCoins);

    return NextResponse.json({ leaderboard });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
