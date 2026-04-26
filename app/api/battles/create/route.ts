import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { spendCoins } from '@/lib/coins';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { opponent_email, wager_coins, duration_days } = await req.json().catch(() => ({}));
  if (!opponent_email || typeof wager_coins !== 'number') {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data: opponent } = await supabase.from('users').select('id').eq('email', opponent_email).single();
  if (!opponent) return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });

  // Deduct wager from initiator
  const spendInitiator = await spendCoins(user.id, wager_coins, 'battle_wager_create');
  if (spendInitiator !== 'ok') return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });

  // Create battle
  const { data: battle } = await supabase.from('streak_battles').insert({
    initiator_id: user.id,
    duration_days: duration_days || 7,
    wager_coins,
    status: 'pending',
  }).select().single();
  if (!battle) return NextResponse.json({ error: 'Battle creation failed' }, { status: 500 });

  // Add initiator participant
  await supabase.from('battle_participants').insert({
    battle_id: battle.id,
    user_id: user.id,
    current_streak: 0,
    best_streak: 0,
  });

  return NextResponse.json({ battle_id: battle.id });
}
