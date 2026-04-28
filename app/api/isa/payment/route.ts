import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const MilestoneSchema = z.object({ contractId: z.string().uuid(), milestone: z.enum(['prelims', 'mains', 'final']) });
const MILESTONE_AMOUNTS: Record<string, number> = { prelims: 2999, mains: 4999, final: 9999 };

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = MilestoneSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { contractId, milestone } = parsed.data;
    if (!MILESTONE_AMOUNTS[milestone]) return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { data: contract } = await supabase.from('isa_contracts').select('*').eq('id', contractId).single();
    if (!contract || contract.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const amount = MILESTONE_AMOUNTS[milestone];
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 });

    const orderPayload = { amount: amount * 100, currency: 'INR', receipt: `${contractId}-${milestone}-${Date.now()}`, notes: { milestone, contractId, userId: user.id } };
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      body: JSON.stringify(orderPayload)
    });
    const order = await res.json();
    if (!res.ok || !order.id) return NextResponse.json({ error: order.error?.description || 'Razorpay error' }, { status: 500 });

    const { error: insertError } = await supabase.from('isa_payments').insert({ contract_id: contractId, milestone, amount, status: 'pending', razorpay_order_id: order.id });
    if (insertError) {
      if (insertError.code === '23505') return NextResponse.json({ error: 'Payment already initiated for this milestone' }, { status: 409 });
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    await supabase.from('user_notifications').insert({
      user_id: user.id, title: `ISA ${milestone} Milestone`, message: `Your payment of ₹${amount} for ${milestone} is ready. Complete it in your dashboard.`
    });
    return NextResponse.json({ orderId: order.id, amount: orderPayload.amount, currency: orderPayload.currency });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
