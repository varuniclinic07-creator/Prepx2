import { createClient } from '@/lib/supabase-server';

export async function checkIsaEligibility(userId: string): Promise<{ eligible: boolean; reason?: string }> {
  const supabase = createClient();
  
  const { data: prediction } = await supabase
    .from('user_predictions')
    .select('confidence_pct')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  const { data: rank } = await supabase
    .from('user_office_ranks')
    .select('current_rank')
    .eq('user_id', userId)
    .single();
  
  if (!prediction || prediction.confidence_pct < 60) {
    return { eligible: false, reason: 'Need prediction confidence ≥ 60%' };
  }
  
  const rankOrder = ['ASO', 'Deputy Collector', 'Collector', 'Secretary', 'Cabinet Secretary'];
  const userRankIdx = rankOrder.indexOf(rank?.current_rank || '');
  const collectorIdx = rankOrder.indexOf('Collector');
  
  if (userRankIdx < collectorIdx) {
    return { eligible: false, reason: 'Need rank Collector or higher' };
  }
  
  return { eligible: true };
}
