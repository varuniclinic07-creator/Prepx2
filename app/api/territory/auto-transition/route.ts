import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date().toISOString();
    const { data: ownerships, error } = await supabase
      .from('territory_ownership')
      .select('id, district_id, squad_id, captured_at')
      .not('captured_at', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const transitioned: string[] = [];
    for (const o of (ownerships || [])) {
      const captured = new Date(o.captured_at);
      const hours = (Date.now() - captured.getTime()) / 36e5;
      if (hours >= 24) {
        await supabase.from('territory_wars').insert({
          district_id: o.district_id,
          attacker_squad_id: o.squad_id,
          defender_squad_id: o.squad_id,
          winner_squad_id: o.squad_id,
          created_at: now,
          finalized_at: now,
        });
        transitioned.push(o.district_id);
      }
    }
    return NextResponse.json({ transitioned, count: transitioned.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
