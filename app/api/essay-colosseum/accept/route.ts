import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// AC-08: Accept match: POST { match_id } → set self as opponent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id } = body;
    if (!match_id) return NextResponse.json({ error: 'match_id required' }, { status: 400 });

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { error } = await supabase.from('essay_colosseum_matches')
      .update({ opponent_id: user.id })
      .eq('id', match_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
