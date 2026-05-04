import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
  return createClient(url, key);
}

// Razorpay puts the webhook creation epoch in `created_at` on the payload.
// Stale captures replayed > 5 min later are almost certainly malicious.
const TIMESTAMP_TOLERANCE_SECONDS = 300;

function verifySignature(body: string, sig: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const expectedBuf = new Uint8Array(Buffer.from(expected, 'utf8'));
  const sigBuf = new Uint8Array(Buffer.from(sig, 'utf8'));
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ received: false, error: 'Webhook secret not configured' }, { status: 500 });
  }

  const sig = req.headers.get('x-razorpay-signature');
  if (!sig) {
    return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 400 });
  }

  // x-razorpay-event-id is unique per event; Razorpay docs name this as the
  // canonical replay-detection key.
  const eventId = req.headers.get('x-razorpay-event-id');
  if (!eventId) {
    return NextResponse.json({ received: false, error: 'Missing x-razorpay-event-id' }, { status: 400 });
  }

  const body = await req.text();
  if (!verifySignature(body, sig, secret)) {
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
  }

  let payload: any;
  try { payload = JSON.parse(body); }
  catch { return NextResponse.json({ received: false, error: 'Invalid JSON' }, { status: 400 }); }

  // Reject stale signatures (replayed captures).
  const createdAt = Number(payload?.created_at);
  if (Number.isFinite(createdAt)) {
    const ageSeconds = Math.floor(Date.now() / 1000) - createdAt;
    if (ageSeconds > TIMESTAMP_TOLERANCE_SECONDS) {
      return NextResponse.json(
        { received: false, error: `signature too old (${ageSeconds}s)` },
        { status: 400 },
      );
    }
  }

  const supabase = getServiceClient();

  // Idempotent record-then-process: PRIMARY KEY on event_id collapses replays
  // to a duplicate response without re-running the side effects below.
  const userId = payload?.payload?.payment?.entity?.notes?.userId
    || payload?.payload?.subscription?.entity?.notes?.userId
    || null;

  const { error: dedupErr } = await supabase
    .from('payment_webhook_events')
    .insert({
      event_id: eventId,
      provider: 'razorpay',
      type: payload?.event || 'unknown',
      user_id: userId,
      payload,
    });
  if (dedupErr) {
    if (dedupErr.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    return NextResponse.json({ received: false, error: 'dedup insert failed' }, { status: 500 });
  }

  try {
    if (payload.event === 'payment.captured') {
      const entity = payload.payload?.payment?.entity || {};
      const orderId = entity.order_id;
      const innerUserId = entity.notes?.userId;
      const plan = entity.notes?.plan || 'premium';
      if (!innerUserId || !orderId) {
        return NextResponse.json({ received: false, error: 'Missing userId or orderId' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from('subscriptions').upsert({
        user_id: innerUserId,
        status: 'active',
        plan,
        current_period_end: periodEnd.toISOString(),
        updated_at: now,
      }, { onConflict: 'user_id' });

      await supabase.from('users').update({ subscription_status: plan, updated_at: now }).eq('id', innerUserId);
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ received: false, error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
