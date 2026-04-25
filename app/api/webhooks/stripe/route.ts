import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json();
  const { type, data } = body;

  if (type === 'checkout.session.completed' || type === 'invoice.paid') {
    const customerId = data?.object?.customer;
    const subscriptionId = data?.object?.subscription;
    const metadata = data?.object?.metadata || {};
    console.log(`[Stripe] Payment complete for customer ${customerId}, subscription ${subscriptionId}`);
    // TODO: update subscriptions table via supabase
  }

  return NextResponse.json({ received: true });
}
