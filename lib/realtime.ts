import type { SupabaseClient, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type ChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

const activeChannels = new Map<string, ReturnType<SupabaseClient['channel']>>();

export function subscribeToTable(
  supabase: SupabaseClient,
  table: string,
  filter: string,
  callback: (payload: ChangePayload) => void
) {
  const channelName = `${table}-${filter}`;
  const existing = activeChannels.get(channelName);
  if (existing) {
    supabase.removeChannel(existing);
    activeChannels.delete(channelName);
  }

  const channel = supabase.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload) => {
      callback(payload);
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error: ${channelName}`);
        activeChannels.delete(channelName);
        setTimeout(() => subscribeToTable(supabase, table, filter, callback), 5000);
      }
    });

  activeChannels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  };
}

export function subscribeToAll(
  supabase: SupabaseClient,
  table: string,
  callback: (payload: ChangePayload) => void
) {
  const channelName = `${table}-all`;
  const existing = activeChannels.get(channelName);
  if (existing) {
    supabase.removeChannel(existing);
    activeChannels.delete(channelName);
  }

  const channel = supabase.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      callback(payload);
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error: ${channelName}`);
        activeChannels.delete(channelName);
        setTimeout(() => subscribeToAll(supabase, table, callback), 5000);
      }
    });

  activeChannels.set(channelName, channel);

  return () => {
    supabase.removeChannel(channel);
    activeChannels.delete(channelName);
  };
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}
