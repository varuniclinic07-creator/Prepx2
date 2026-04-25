import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function subscribeToTable(
  supabase: SupabaseClient,
  table: string,
  filter: string,
  callback: (payload: any) => void
) {
  const channel = supabase.channel(`${table}-changes-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAll(
  supabase: SupabaseClient,
  table: string,
  callback: (payload: any) => void
) {
  const channel = supabase.channel(`${table}-all-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, count } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}
