import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// AC-10: List matches for current user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ matches: [] });

    const { data: matches, error } = await supabase
      .from('essay_colosseum_matches')
      .select('*')
      .or(`initiator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ matches: matches || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
