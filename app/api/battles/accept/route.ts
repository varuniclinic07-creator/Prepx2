import { NextResponse } from 'next/server';
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

    const { data: battle } = await supabase.from('streak_battles').select('wager_coins').eq('id', battle_id).single();
    if (!battle) return NextResponse.json({ error: 'Battle not found' }, { status: 404 });

    const { data: accepted, error } = await supabase.rpc('accept_battle', {
      p_battle_id: battle_id,
      p_user_id: user.id,
      p_wager: battle.wager_coins || 0,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!accepted) return NextResponse.json({ error: 'Cannot accept battle — already active, own battle, or insufficient coins' }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
