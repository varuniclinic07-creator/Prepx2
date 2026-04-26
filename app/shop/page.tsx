'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price_inr: number;
  image: string;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'coin_pack_100', name: '100 Coins', description: 'Instant coin top-up for boosts', price_inr: 499, image: '🪙' },
  { id: 'premium_month', name: 'Premium Monthly', description: 'Full premium access for 30 days', price_inr: 1999, image: '✨' },
  { id: 'ai_tutor_pack', name: 'AI Tutor Pack', description: '10 AI 1-on-1 tutoring sessions', price_inr: 999, image: '🎓' },
  { id: 'mock_interview_pack', name: 'Interview Bundle', description: '3 AI-evaluated mock interviews', price_inr: 2999, image: '🎤' },
];

export default function ShopPage() {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from('user_balances').select('coins').eq('user_id', data.user.id).single().then(({ data: b }) => {
          setBalance(b?.coins ?? 0);
        });
        supabase.from('coin_transactions').select('id,amount,reason,created_at').eq('user_id', data.user.id).order('created_at', { ascending: false }).limit(10).then(({ data: t }) => {
          setTxns(t || []);
        });
      }
    });
  }, []);

  const handleBuy = async (item: ShopItem) => {
    if (!user) { alert('Login required'); return; }
    setLoading(item.id);
    try {
      const res = await fetch('/api/payments/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: item.id, amount_inr: item.price_inr }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Payment failed'); return; }

      const loadScript = () => new Promise<void>((resolve) => {
        if ((window as any).Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
      await loadScript();

      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: data.amount,
        currency: data.currency,
        name: 'PrepX',
        description: item.name,
        order_id: data.orderId,
        handler: async (response: any) => {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: data.orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          if (verifyRes.ok) {
            alert('Purchase successful!');
          } else {
            alert('Payment verification failed');
          }
        },
        prefill: { name: user.email, email: user.email },
        theme: { color: '#10b981' },
      });
      rzp.open();
    } catch (e: any) {
      alert(e?.message || 'Payment failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Shop</h1>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span className="text-amber-400 font-bold">{balance} coins</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SHOP_ITEMS.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
            <div className="text-3xl mb-2">{item.image}</div>
            <h3 className="text-lg font-semibold text-slate-100">{item.name}</h3>
            <p className="text-sm text-slate-400 mt-1 flex-1">{item.description}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-amber-400 font-bold">₹{item.price_inr}</span>
              <button
                onClick={() => handleBuy(item)}
                disabled={!!loading}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition text-sm"
              >
                {loading === item.id ? '...' : 'Buy'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Recent Transactions</h2>
        {txns.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {txns.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between bg-slate-800 rounded-lg p-3 text-sm">
                <div>
                  <span className="text-slate-200">{t.reason}</span>
                  <span className="text-slate-500 ml-2 text-xs">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`font-bold ${t.amount >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {t.amount >= 0 ? '+' : ''}{t.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
