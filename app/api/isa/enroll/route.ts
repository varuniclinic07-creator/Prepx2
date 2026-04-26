import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ eligible: false, reason: 'Login required' }, { status: 401 });

    const { data: existing } = await supabase.from('isa_contracts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    if (existing) return NextResponse.json({ contract: existing });

    const { data: prediction } = await supabase.from('user_predictions').select('confidence_pct').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
    const { data: rank } = await supabase.from('user_office_ranks').select('current_rank').eq('user_id', user.id).single();

    if (!prediction || prediction.confidence_pct < 60) return NextResponse.json({ eligible: false, reason: 'Need prediction confidence ≥ 60%' });
    const rankOrder = ['ASO', 'Deputy Collector', 'Collector', 'Secretary', 'Cabinet Secretary'];
    if (rankOrder.indexOf(rank?.current_rank || '') < rankOrder.indexOf('Collector')) return NextResponse.json({ eligible: false, reason: 'Need rank Collector or higher' });
    return NextResponse.json({ eligible: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { data: existing } = await supabase.from('isa_contracts').select('id').eq('user_id', user.id).limit(1).single();
    if (existing) return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });

    const { data: contract } = await supabase.from('isa_contracts').insert({
      user_id: user.id, status: 'active', total_due: 0, prelims_cleared: false, mains_cleared: false, final_selected: false,
    }).select().single();

    await supabase.from('user_notifications').insert({
      user_id: user.id, title: 'Vijay Guarantee Enrolled', message: 'You have successfully enrolled in the Vijay Guarantee ISA program.'
    });
    return NextResponse.json({ contract });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
