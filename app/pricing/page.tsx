'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Plan {
  name: string;
  price: string;
  period: string;
  amount: number;
  features: string[];
  cta: string;
  plan: string;
  highlight: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    amount: 0,
    features: ['Daily Plan', 'Basic Quizzes', 'Study Squads', 'Topic Coverage'],
    cta: 'Continue Free',
    plan: 'free',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '₹499',
    period: '/month',
    amount: 49900,
    features: ['Everything in Free', 'Advanced Analytics', 'Predictive Questions', 'Progress Dashboard'],
    cta: 'Upgrade',
    plan: 'premium',
    highlight: true,
  },
  {
    name: 'Premium+',
    price: '₹999',
    period: '/month',
    amount: 99900,
    features: ['Everything in Premium', 'Government Sources', 'AI Essays', 'Clean PDF Export'],
    cta: 'Go Premium+',
    plan: 'premium_plus',
    highlight: false,
  },
];

export default function PricingPage() {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handlePlan = async (plan: Plan) => {
    if (plan.amount === 0) {
      window.location.href = '/';
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setToast({ type: 'error', message: 'Please log in to subscribe.' });
        setBusy(false);
        return;
      }
      const res = await fetch('/api/payments/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: plan.amount / 100, userId: user.id, plan: plan.plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.orderId) {
        setToast({ type: 'error', message: data.error || 'Unable to create order. Please try again.' });
        setBusy(false);
        return;
      }

      const rzpKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (typeof (window as any).Razorpay !== 'function') {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
          document.body.appendChild(script);
        });
      }

      if (!rzpKey) {
        setToast({ type: 'error', message: 'Payment gateway not configured.' });
        setBusy(false);
        return;
      }
      const rzp = new (window as any).Razorpay({
        key: rzpKey,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'PrepX',
        description: `${plan.name} Subscription`,
        order_id: data.orderId,
        handler: function () {
          window.location.href = '/dashboard?payment=success';
        },
        prefill: {
          email: user.email || '',
        },
        theme: { color: '#10b981' },
        modal: {
          ondismiss: function () {
            setToast({ type: 'error', message: 'Payment cancelled. You can retry anytime.' });
            setBusy(false);
          },
        },
      });
      rzp.on('payment.failed', function () {
        setToast({ type: 'error', message: 'Payment failed. Please retry or use a different method.' });
        setBusy(false);
      });
      rzp.open();
    } catch (e: any) {
      setToast({ type: 'error', message: e.message || 'Something went wrong. Please retry.' });
      setBusy(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${toast.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
          {toast.message}
        </div>
      )}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-100">PrepX Plans</h1>
        <p className="text-slate-400">Choose the plan that matches your ambition.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(p => (
          <div
            key={p.name}
            className={`rounded-2xl border p-6 space-y-4 ${p.highlight ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-900'}`}
          >
            <h3 className={`text-lg font-bold ${p.highlight ? 'text-emerald-400' : 'text-slate-100'}`}>{p.name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-100">{p.price}</span>
              <span className="text-sm text-slate-500">{p.period}</span>
            </div>
            <ul className="space-y-2 text-sm text-slate-400">
              {p.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2"><span className="text-emerald-400">✓</span>{f}</li>
              ))}
            </ul>
            <button
              onClick={() => handlePlan(p)}
              disabled={busy}
              className={`block w-full text-center py-2.5 rounded-xl font-bold transition ${
                p.highlight
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 disabled:bg-slate-700'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:bg-slate-700'
              }`}
            >
              {busy ? 'Processing...' : p.cta}
            </button>
          </div>
        ))}
      </div>
      <div className="text-center pt-4">
        <Link href="/isa" className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
          Vijay Guarantee — Pay ₹0 upfront →
        </Link>
      </div>
      <div className="text-center pt-2">
        <Link href="/tutors" className="text-sm text-emerald-400 hover:text-emerald-300 underline underline-offset-4">
          AI Teacher Marketplace →
        </Link>
      </div>
    </div>
  );
}
