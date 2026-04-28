import type { SupabaseClient } from '@supabase/supabase-js';

export async function getBalance(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase
    .from('user_balances')
    .select('coins')
    .eq('user_id', userId)
    .single();
  return data?.coins ?? 0;
}

export async function getTransactions(supabase: SupabaseClient, userId: string, limit = 10) {
  const { data } = await supabase
    .from('coin_transactions')
    .select('id,amount,reason,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function awardCoins(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  idempotencyKey: string
): Promise<boolean> {
  if (amount <= 0) return false;

  const { data: existing } = await supabase
    .from('coin_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('idempotency_key', idempotencyKey)
    .single();
  if (existing) return false;

  const { error: insertErr } = await supabase.from('coin_transactions').insert({
    user_id: userId,
    amount,
    reason,
    idempotency_key: idempotencyKey,
  });
  if (insertErr) return false;

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
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string
): Promise<'ok' | 'insufficient' | 'error'> {
  if (amount <= 0) return 'error';

  const { data, error } = await supabase.rpc('spend_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) return 'error';
  const newBalance = data as number;
  return newBalance >= 0 ? 'ok' : 'insufficient';
}
