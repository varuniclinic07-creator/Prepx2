import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { awardCoins } from '@/lib/coins';
import { z } from 'zod';

const BodySchema = z.object({
  amount: z.number().int().positive().max(10000),
  reason: z.string().min(1).max(200),
  idempotency_key: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const awarded = await awardCoins(supabase, user.id, parsed.data.amount, parsed.data.reason, parsed.data.idempotency_key);
    return NextResponse.json({ awarded });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
