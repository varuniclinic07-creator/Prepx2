import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getBalance, getTransactions, spendCoins } from '@/lib/coins';

export const metadata: Metadata = {
  title: 'Coin Shop | prepx',
  description: 'Redeem your coins for premium perks',
};

interface ShopItem {
  id: string;
  name: string;
  description: string;
  coinCost: number;
  icon: string;
}

const SHOP_ITEMS: ShopItem[] = [
  { id: 'premium_day', name: '1-Day Premium', description: 'Unlock all premium for 24h', coinCost: 500, icon: '✨' },
  { id: 'ai_video', name: 'AI Video Lecture', description: 'Personalized AI teaching session', coinCost: 2000, icon: '🎬' },
  { id: 'mock_interview', name: 'Mock Interview', description: 'AI-evaluated mock UPSC interview', coinCost: 5000, icon: '🎤' },
];

async function handlePurchase(formData: FormData) {
  'use server';
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const itemId = formData.get('item_id') as string;
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) return;
  const result = await spendCoins(user.id, item.coinCost, `Redeemed: ${item.name}`);
  if (result === 'ok') {
    // TODO: update subscription/feature flag or log
    await supabase.from('activity_log').insert({
      user_id: user.id,
      event_type: 'coin_redeem',
      metadata: { item_id: item.id, cost: item.coinCost },
    });
  }
}

export default async function ShopPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const balance = await getBalance(user.id);
  const txns = await getTransactions(user.id, 10);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Coin Shop</h1>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <span className="text-amber-400 font-bold">{balance} coins</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {SHOP_ITEMS.map(item => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
            <div className="text-3xl mb-2">{item.icon}</div>
            <h3 className="text-lg font-semibold text-slate-100">{item.name}</h3>
            <p className="text-sm text-slate-400 mt-1 flex-1">{item.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-amber-400 font-bold">{item.coinCost} 🪙</span>
              <form action={handlePurchase}>
                <input type="hidden" name="item_id" value={item.id} />
                <button
                  type="submit"
                  disabled={balance < item.coinCost}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-bold rounded-lg transition text-sm"
                >
                  {balance < item.coinCost ? 'Too expensive' : 'Redeem'}
                </button>
              </form>
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
