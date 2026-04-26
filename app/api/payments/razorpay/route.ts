import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { item_id, amount_inr } = body;
    if (!item_id || !amount_inr || amount_inr <= 0) {
      return NextResponse.json({ error: 'Invalid item or amount' }, { status: 400 });
    }

    const Razorpay = (await import('razorpay')).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID || '',
      key_secret: process.env.RAZORPAY_KEY_SECRET || '',
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount_inr * 100),
      currency: 'INR',
      receipt: `rcp-${item_id}-${Date.now()}`,
      notes: { userId: user.id, item_id: String(item_id) },
    });

    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Payment creation failed' }, { status: 500 });
  }
}
