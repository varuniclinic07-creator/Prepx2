import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ tutorId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { tutorId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

    const { data: tutor } = await supabase.from('ai_tutors').select('price').eq('id', tutorId).single();
    if (!tutor) return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    const price = tutor.price || 499;
    const amount = price * 100;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return NextResponse.json({ error: 'Razorpay not configured' }, { status: 500 });

    const orderPayload = { amount, currency: 'INR', receipt: `tutor-${user.id.slice(0,8)}-${Date.now()}`, notes: { tutorId, userId: user.id } };
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      body: JSON.stringify(orderPayload)
    });
    const order = await res.json();
    if (!res.ok || !order.id) return NextResponse.json({ error: order.error?.description || 'Razorpay error' }, { status: 500 });

    const expires = new Date(); expires.setMonth(expires.getMonth() + 1);
    const { data: sub, error: subError } = await supabase.from('tutor_subscriptions').insert({ user_id: user.id, tutor_id: tutorId, status: 'active', expires_at: expires.toISOString() }).select().single();
    if (subError) {
      if (subError.code === '23505') return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }
    await supabase.rpc('increment_subscriber_count', { p_tutor_id: tutorId });
    return NextResponse.json({ orderId: order.id, amount, currency: orderPayload.currency, subscription: sub });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
