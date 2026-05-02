// /api/mnemonics/[id]/rate
//   POST { rating: 1..5, comment?: string }
//   Upserts mnemonic_ratings (UNIQUE on mnemonic_id + user_id).

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: mnemonicId } = await ctx.params;
  if (!mnemonicId) return NextResponse.json({ error: 'mnemonic id required' }, { status: 400 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rating = Number(body?.rating);
  const comment: string | null = typeof body?.comment === 'string' ? body.comment.slice(0, 500) : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be integer 1..5' }, { status: 400 });
  }

  const { data, error } = await sb
    .from('mnemonic_ratings')
    .upsert(
      { mnemonic_id: mnemonicId, user_id: user.id, rating, comment },
      { onConflict: 'mnemonic_id,user_id' },
    )
    .select('id, rating, comment')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, rating: data });
}
