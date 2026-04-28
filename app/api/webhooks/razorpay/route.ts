import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  return createClient(url, key);
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ received: false, error: 'Webhook secret not configured' }, { status: 500 });

  const sig = req.headers.get('x-razorpay-signature');
  if (!sig) {
    return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 400 });
  }

  const body = await req.text();
  try {
    const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8') as unknown as Uint8Array;
    const sigBuf = Buffer.from(sig, 'utf8') as unknown as Uint8Array;
    if (Buffer.byteLength(expectedBuf) !== Buffer.byteLength(sigBuf) || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
      return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ received: false, error: 'Signature verification failed' }, { status: 400 });
  }

  const payload = JSON.parse(body);
  const supabase = getServiceClient();
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
