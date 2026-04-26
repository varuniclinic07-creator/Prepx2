import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const MILESTONE_AMOUNTS: Record<string, number> = {
  prelims: 2999,
  mains: 4999,
  final: 9999,
};

export async function POST(req: Request) {
  const { contractId, milestone } = await req.json() as { contractId: string; milestone: string };
  if (!contractId || !milestone || !MILESTONE_AMOUNTS[milestone]) {
    return NextResponse.json({ error: 'Invalid contract or milestone' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { data: contract } = await supabase.from('isa_contracts').select('*').eq('id', contractId).single();
  if (!contract || contract.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: existing } = await supabase.from('isa_payments').select('id').eq('contract_id', contractId).eq('milestone', milestone).single();
  if (existing) return NextResponse.json({ error: 'Payment already initiated' }, { status: 409 });

  const amount = MILESTONE_AMOUNTS[milestone];
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

  const orderPayload = {
    amount: amount * 100,
    currency: 'INR',
    receipt: `${contractId}-${milestone}-${Date.now()}`,
    notes: { milestone, contractId, userId: user.id }
  };

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
    },
    body: JSON.stringify(orderPayload)
  });

  const order = await res.json();
  if (!res.ok || !order.id) {
    return NextResponse.json({ error: order.error?.description || 'Razorpay error' }, { status: 500 });
  }

  await supabase.from('isa_payments').insert({
    contract_id: contractId,
    milestone,
    amount,
    status: 'pending',
    razorpay_order_id: order.id,
  });

  await supabase.from('user_notifications').insert({
    user_id: user.id,
    title: `ISA ${milestone} Milestone`,
    message: `Your payment of ₹${amount} for ${milestone} is ready. Complete it in your dashboard.`
  });

  return NextResponse.json({ orderId: order.id, amount: orderPayload.amount, currency: orderPayload.currency });
}
