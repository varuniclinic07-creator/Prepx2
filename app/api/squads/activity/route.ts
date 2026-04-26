import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: squads } = await supabase
      .from('squad_members')
      .select('squad_id')
      .eq('user_id', user.id);

    const squadIds = (squads || []).map(s => s.squad_id);
    if (squadIds.length === 0) return NextResponse.json({ activity: [] });

    const { data: battles } = await supabase
      .from('streak_battles')
      .select('id, winner_id, created_at, ended_at')
      .in('initiator_id', (await supabase.from('squad_members').select('user_id').in('squad_id', squadIds)).data?.map((m: any) => m.user_id) || [])
      .order('created_at', { ascending: false })
      .limit(20);

    const activity = (battles || []).map(b => ({
      type: b.winner_id ? 'battle_won' : 'battle_started',
      message: b.winner_id ? 'A squad member won a battle!' : 'A squad member started a battle.',
      created_at: b.created_at,
    }));

    return NextResponse.json({ activity });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
