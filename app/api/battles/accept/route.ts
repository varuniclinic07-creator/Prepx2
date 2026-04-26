import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { spendCoins } from '@/lib/coins';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { battle_id } = await req.json().catch(() => ({}));
  if (!battle_id) return NextResponse.json({ error: 'Missing battle_id' }, { status: 400 });

  // Get battle
  const { data: battle } = await supabase.from('streak_battles').select('*').eq('id', battle_id).single();
  if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
  if (battle.status !== 'pending') return NextResponse.json({ error: 'Battle already started' }, { status: 400 });
  if (battle.initiator_id === user.id) return NextResponse.json({ error: 'Cannot accept own battle' }, { status: 400 });

  // Deduct wager from acceptor
  const spendResult = await spendCoins(user.id, battle.wager_coins, 'battle_wager_accept');
  if (spendResult !== 'ok') return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });

  // Add opponent participant
  await supabase.from('battle_participants').insert({
    battle_id,
    user_id: user.id,
    current_streak: 0,
    best_streak: 0,
  });

  // Activate battle
  await supabase.from('streak_battles').update({ status: 'active', created_at: new Date().toISOString() }).eq('id', battle_id);

  return NextResponse.json({ ok: true });
}
