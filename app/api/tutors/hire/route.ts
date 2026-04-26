import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const { tutorId } = await req.json() as { tutorId: string };
  if (!tutorId) return NextResponse.json({ error: 'tutorId required' }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Login required' }, { status: 401 });

  const { data: existing } = await supabase.from('tutor_subscriptions').select('id').eq('user_id', user.id).eq('tutor_id', tutorId).single();
  if (existing) return NextResponse.json({ error: 'Already subscribed' }, { status: 409 });

  const { data: tutor } = await supabase.from('ai_tutors').select('price').eq('id', tutorId).single();
  const price = tutor?.price || 499;
  const amount = price * 100;
  const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';

  const orderPayload = { amount, currency: 'INR', receipt: `tutor-${user.id.slice(0,8)}-${Date.now()}`, notes: { tutorId, userId: user.id } };
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
    body: JSON.stringify(orderPayload)
  });
  const order = await res.json();
  if (!res.ok || !order.id) return NextResponse.json({ error: order.error?.description || 'Razorpay error' }, { status: 500 });

  const expires = new Date(); expires.setMonth(expires.getMonth() + 1);
  const { data: sub } = await supabase.from('tutor_subscriptions').insert({
    user_id: user.id, tutor_id: tutorId, status: 'active', expires_at: expires.toISOString(),
  }).select().single();

  await supabase.from('ai_tutors').update({ subscriber_count: (tutor?.subscriber_count || 0) + 1 }).eq('id', tutorId);
  return NextResponse.json({ orderId: order.id, amount, currency: orderPayload.currency, subscription: sub });
}
