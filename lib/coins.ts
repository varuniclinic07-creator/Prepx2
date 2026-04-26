import { supabase } from './supabase';

// ── Coins Economy ──
// AC-01: awardCoins prevents duplicate transactions via idempotency key
// AC-02: getBalance returns current coins for a user
// AC-03: spendCoins deducts only if sufficient balance

export async function getBalance(userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_balances')
    .select('coins')
    .eq('user_id', userId)
    .single();
  return data?.coins ?? 0;
}

export async function getTransactions(userId: string, limit = 10) {
  const { data } = await supabase
    .from('coin_transactions')
    .select('id,amount,reason,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function awardCoins(
  userId: string,
  amount: number,
  reason: string,
  idempotencyKey: string
): Promise<boolean> {
  if (amount <= 0) return false;

  // Check if already processed (AC-04: Duplicate transactions prevented by idempotency key)
  const { data: existing } = await supabase
    .from('coin_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .single();
  if (existing) return false;

  // Insert transaction
  const { error: insertErr } = await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount,
    reason,
    idempotency_key: idempotencyKey,
  });
  if (insertErr) return false;

  // Upsert balance
  const { data: balance } = await supabase
    .from('user_balances')
    .select('coins,lifetime_earned')
    .eq('user_id', userId)
    .single();

  if (balance) {
    await supabase
      .from('user_balances')
      .update({
        coins: balance.coins + amount,
        lifetime_earned: balance.lifetime_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  } else {
    await supabase.from('user_balances').insert({
      user_id: userId,
      coins: amount,
      lifetime_earned: amount,
    });
  }
  return true;
}

export async function spendCoins(
  userId: string,
  amount: number,
  reason: string
): Promise<'ok' | 'insufficient' | 'error'> {
  if (amount <= 0) return 'error';

  const { data: balance } = await supabase
    .from('user_balances')
    .select('coins')
    .eq('user_id', userId)
    .single();

  const current = balance?.coins ?? 0;
  if (current < amount) return 'insufficient';

  // Insert spend transaction with negative amount
  const { error: insertErr } = await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount: -amount,
    reason,
    idempotency_key: `spend-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
  if (insertErr) return 'error';

  await supabase
    .from('user_balances')
    .update({ coins: current - amount })
    .eq('user_id', userId);

  return 'ok';
}
