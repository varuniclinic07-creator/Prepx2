import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// Reject events whose signed timestamp is older than this. Stripe recommends 5
// minutes — anything older is almost certainly a replay attempt with a captured
// payload, since legitimate webhooks land within seconds.
const SIGNATURE_TOLERANCE_SECONDS = 300;

function verifyStripeSignature(
  payload: string,
  sig: string,
  secret: string,
): { ok: true; timestamp: number } | { ok: false; reason: string } {
  const elements = sig.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
  const v1Signature = elements.find(e => e.startsWith('v1='))?.slice(3);
  if (!timestamp || !v1Signature) return { ok: false, reason: 'malformed signature' };

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'bad timestamp' };
  const ageSeconds = Math.floor(Date.now() / 1000) - tsNum;
  if (ageSeconds > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: `signature too old (${ageSeconds}s)` };
  }
  if (ageSeconds < -SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: 'signature timestamp in the future' };
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload, 'utf8').digest('hex');
  const expectedBuf = new Uint8Array(Buffer.from(expected, 'utf8'));
  const sigBuf = new Uint8Array(Buffer.from(v1Signature, 'utf8'));
  if (expectedBuf.length !== sigBuf.length) return { ok: false, reason: 'length mismatch' };
  if (!crypto.timingSafeEqual(expectedBuf, sigBuf)) return { ok: false, reason: 'hmac mismatch' };
  return { ok: true, timestamp: tsNum };
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 500 });

  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });

  const body = await req.text();
  const verdict = verifyStripeSignature(body, sig, secret);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Invalid signature: ${verdict.reason}` }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(body); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!event?.id || typeof event.id !== 'string') {
    return NextResponse.json({ error: 'Missing event id' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Replay protection: insert event id; UNIQUE PK on stripe_webhook_events.event_id
  // means a duplicate insert collapses to a no-op return.
  const { error: dedupErr } = await supabase
    .from('stripe_webhook_events')
    .insert({
      event_id: event.id,
      type: event.type,
      user_id: event.data?.object?.metadata?.userId ?? null,
      payload: event,
    });
  if (dedupErr) {
    if (dedupErr.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ error: 'dedup insert failed' }, { status: 500 });
  }

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
