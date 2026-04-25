import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
  const sig = req.headers.get('x-razorpay-signature');
  if (!sig || !secret) {
    return NextResponse.json({ received: false, error: 'Missing signature or secret' }, { status: 400 });
  }

  const body = await req.text();
  const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected) as any, Buffer.from(sig) as any)) {
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
  }

  const payload = JSON.parse(body);
  try {
    if (payload.event === 'payment.captured') {
      const entity = payload.payload?.payment?.entity || {};
      const orderId = entity.order_id;
      const userId = entity.notes?.userId;
      const plan = entity.notes?.plan || 'premium';
      if (!userId || !orderId) {
        return NextResponse.json({ received: false, error: 'Missing userId or orderId' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        status: 'active',
        plan,
        current_period_end: periodEnd.toISOString(),
        updated_at: now,
      }, { onConflict: 'user_id' });

      await supabase.from('users').update({ subscription_status: plan, updated_at: now }).eq('id', userId);
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ received: false, error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
