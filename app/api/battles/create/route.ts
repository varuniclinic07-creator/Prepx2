import { NextResponse } from 'next/server';
import { spendCoins } from '@/lib/coins';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ opponent_email: z.string().email(), wager_coins: z.number().int().positive(), duration_days: z.number().int().optional() });

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { opponent_email, wager_coins, duration_days } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: opponent } = await supabase.from('users').select('id').eq('email', opponent_email).single();
    if (!opponent) return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });

    const spendInitiator = await spendCoins(user.id, wager_coins, 'battle_wager_create');
    if (spendInitiator !== 'ok') return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });

    const { data: battle } = await supabase.from('streak_battles').insert({
      initiator_id: user.id, duration_days: duration_days || 7, wager_coins, status: 'pending',
    }).select().single();
    if (!battle) return NextResponse.json({ error: 'Battle creation failed' }, { status: 500 });

    await supabase.from('battle_participants').insert({ battle_id: battle.id, user_id: user.id, current_streak: 0, best_streak: 0 });
    return NextResponse.json({ battle_id: battle.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
