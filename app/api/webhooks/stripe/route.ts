import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  return createClient(url, key);
}

function verifyStripeSignature(payload: string, sig: string, secret: string): boolean {
  const elements = sig.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
  const v1Signature = elements.find(e => e.startsWith('v1='))?.slice(3);
  if (!timestamp || !v1Signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = new Uint8Array(Buffer.from(expected, 'utf8'));
  const sigBuf = new Uint8Array(Buffer.from(v1Signature, 'utf8'));
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  const body = await req.text();
  if (!verifyStripeSignature(body, sig, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);
  const supabase = getServiceClient();
  try {
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.paid') {
      const obj = event.data?.object;
      const userId = obj?.metadata?.userId;
      const plan = obj?.metadata?.plan || 'premium';
      if (!userId) return NextResponse.json({ error: 'Missing userId in metadata' }, { status: 400 });

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
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
