import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const AcceptSchema = z.object({ match_id: z.string().uuid() });

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = AcceptSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { match_id } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // FIX 2.6: IDOR check — only the explicitly invited user (or any auth user for open matches) may accept.
    const { data: match, error: matchErr } = await supabase
      .from('essay_colosseum_matches')
      .select('invited_user_id, initiator_id, status')
      .eq('id', match_id)
      .single();
    if (matchErr || !match) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (match.initiator_id === user.id) return NextResponse.json({ error: 'Cannot accept your own match' }, { status: 403 });
    const isInvited = match.invited_user_id === user.id && (match.status === 'pending' || match.status === 'open');
    const isOpen = match.invited_user_id === null && match.status === 'open';
    if (!isInvited && !isOpen) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('essay_colosseum_matches')
      .update({ opponent_id: user.id, status: 'accepted' })
      .eq('id', match_id)
      .eq('status', match.status); // optimistic lock to prevent double-accept race
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
