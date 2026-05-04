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

  // Atomic: a UNIQUE(user_id, idempotency_key) catches replays inside the RPC,
  // and the transaction insert + balance upsert can't desync mid-flight.
  const { data, error } = await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });
  if (error) return false;
  return typeof data === 'number' && data >= 0;
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
