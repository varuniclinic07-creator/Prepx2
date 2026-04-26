import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: districts } = await supabase.from('districts').select('*').order('name');
    const { data: squads } = await supabase.from('squads').select('id, name');
    const { data: ownership } = await supabase.from('territory_ownership').select('*');

    const enriched = (districts || []).map((d: any) => {
      const owners = (ownership || []).filter((o: any) => o.district_id === d.id);
      const top = owners.sort((a: any, b: any) => (b.capture_count || 0) - (a.capture_count || 0))[0];
      return {
        ...d,
        owner_squad: top ? (squads || []).find((s: any) => s.id === top.squad_id)?.name || 'Unknown' : null,
        owner_squad_id: top?.squad_id || null,
        capture_count: top?.capture_count || 0,
      };
    });

    return NextResponse.json({ districts: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
