import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { amount, userId, plan } = await req.json();
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const orderPayload = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `${userId}-${Date.now()}`,
      notes: { plan, userId }
    };
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
      },
      body: JSON.stringify(orderPayload)
    });
    const data = await res.json();
    return NextResponse.json({ orderId: data.id, amount: orderPayload.amount, currency: orderPayload.currency });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
