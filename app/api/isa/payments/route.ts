import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: contract } = await supabase
      .from('isa_contracts')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!contract) return NextResponse.json({ payments: [] });

    const { data: payments, error } = await supabase
      .from('isa_payments')
      .select('*')
      .eq('contract_id', contract.id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ payments: payments || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
