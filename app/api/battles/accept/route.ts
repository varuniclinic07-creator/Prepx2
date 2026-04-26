import { NextResponse } from 'next/server';
import { spendCoins } from '@/lib/coins';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ battle_id: z.string().uuid() });

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { battle_id } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: battle } = await supabase.from('streak_battles').select('*').eq('id', battle_id).single();
    if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    if (battle.status !== 'pending') return NextResponse.json({ error: 'Battle already started' }, { status: 400 });
    if (battle.initiator_id === user.id) return NextResponse.json({ error: 'Cannot accept own battle' }, { status: 400 });

    const spendResult = await spendCoins(user.id, battle.wager_coins, 'battle_wager_accept');
    if (spendResult !== 'ok') return NextResponse.json({ error: 'Insufficient coins' }, { status: 400 });

    await supabase.from('battle_participants').insert({ battle_id, user_id: user.id, current_streak: 0, best_streak: 0 });
    await supabase.from('streak_battles').update({ status: 'active', created_at: new Date().toISOString() }).eq('id', battle_id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
