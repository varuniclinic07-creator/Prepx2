import { createClient } from '@/lib/supabase-server';
import { awardCoins } from './coins';

export type OfficerRank = 'ASO' | 'Deputy Collector' | 'Collector' | 'Secretary' | 'Cabinet Secretary';

const RANK_ORDER: OfficerRank[] = ['ASO', 'Deputy Collector', 'Collector', 'Secretary', 'Cabinet Secretary'];

const RANK_REQUIREMENTS: Record<OfficerRank, (userId: string, supabase: any) => Promise<boolean>> = {
  'ASO': async () => true,
  'Deputy Collector': async (userId, supabase) => {
    // 7-day streak + 50 correct answers
    const { data: user } = await supabase.from('users').select('streak_count').eq('id', userId).single();
    if ((user?.streak_count || 0) < 7) return false;
    const { data: attempts } = await supabase.from('quiz_attempts').select('score, max_score').eq('user_id', userId);
    const correct = (attempts || []).reduce((acc: number, a: any) => acc + (a.score || 0), 0);
    return correct >= 50;
  },
  'Collector': async (userId, supabase) => {
    // 30-day streak + 5 essays scored >70%
    const { data: user } = await supabase.from('users').select('streak_count').eq('id', userId).single();
    if ((user?.streak_count || 0) < 30) return false;
    const { data: essays } = await supabase.from('mains_attempts').select('scores').eq('user_id', userId);
    const highScoring = (essays || []).filter((e: any) => (e.scores?.overall || 0) >= 7).length;
    return highScoring >= 5;
  },
  'Secretary': async (userId, supabase) => {
    // 100-day streak + 1 mock test
    const { data: user } = await supabase.from('users').select('streak_count').eq('id', userId).single();
    if ((user?.streak_count || 0) < 100) return false;
    const { count } = await supabase.from('quiz_attempts').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    return (count || 0) >= 1;
  },
  'Cabinet Secretary': async (userId, supabase) => {
    // 200-day streak + predicted top 500 + 3 referrals
    const { data: user } = await supabase.from('users').select('streak_count').eq('id', userId).single();
    if ((user?.streak_count || 0) < 200) return false;
    const { data: pred } = await supabase.from('user_predictions').select('predicted_rank_max').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single();
    if (!pred || (pred.predicted_rank_max || 9999) > 500) return false;
    // Referrals: count users who joined via this user's referral code (simplified: count new squad_members created by this user)
    const { data: squads } = await supabase.from('squads').select('id').eq('created_by', userId);
    const squadIds = (squads || []).map((s: any) => s.id);
    if (squadIds.length === 0) return false;
    const { count } = await supabase.from('squad_members').select('*', { count: 'exact', head: true }).in('squad_id', squadIds);
    return (count || 0) >= 3;
  },
};

export async function checkAndPromoteUser(userId: string): Promise<{ promoted: boolean; newRank?: OfficerRank; oldRank?: OfficerRank }> {
  const supabase = await createClient();

  // Fetch current rank
  const { data: rankRow } = await supabase.from('user_office_ranks').select('*').eq('user_id', userId).single();
  const currentRank: OfficerRank = rankRow?.current_rank || 'ASO';
  const currentIdx = RANK_ORDER.indexOf(currentRank);
  const nextRank = RANK_ORDER[currentIdx + 1];

  if (!nextRank) return { promoted: false };

  const meetsCriteria = await RANK_REQUIREMENTS[nextRank](userId, supabase);
  if (!meetsCriteria) return { promoted: false, oldRank: currentRank };

  // Promote
  const { error: updateErr } = await supabase.from('user_office_ranks').upsert({
    user_id: userId,
    current_rank: nextRank,
    promoted_at: new Date().toISOString(),
    next_rank_requirement: {},
  });

  if (updateErr) {
    console.error('[Rank Promotion] Update failed:', updateErr);
    return { promoted: false };
  }

  // Award 1000 coins per rank-up
  await awardCoins(userId, 1000, `Promoted to ${nextRank}`, `rankup-${nextRank}-${Date.now()}`);

  // Send notification
  await supabase.from('user_notifications').insert({
    user_id: userId,
    title: `Promoted to ${nextRank}!`,
    message: `Congratulations! You have been promoted to ${nextRank}. Keep up the excellent work!`,
  });

  return { promoted: true, newRank: nextRank, oldRank: currentRank };
}

export async function getUserRank(userId: string): Promise<{ current_rank: OfficerRank; promoted_at: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.from('user_office_ranks').select('*').eq('user_id', userId).single();
  return { current_rank: data?.current_rank || 'ASO', promoted_at: data?.promoted_at || null };
}

export function getRankProgress(currentRank: OfficerRank, userData: any): number {
  // Returns 0-100 progress to next rank based on current criteria
  if (currentRank === 'Cabinet Secretary') return 100;

  const streak = userData?.streak_count || 0;
  const correct = userData?.correct_answers || 0;
  const essays = userData?.high_scoring_essays || 0;
  const tests = userData?.mock_tests || 0;
  const rank = userData?.predicted_rank || 9999;
  const referrals = userData?.referrals || 0;

  switch (currentRank) {
    case 'ASO':
      return Math.min(100, Math.round(((Math.min(streak, 7) / 7) * 0.5 + (Math.min(correct, 50) / 50) * 0.5) * 100));
    case 'Deputy Collector':
      return Math.min(100, Math.round(((Math.min(streak, 30) / 30) * 0.5 + (Math.min(essays, 5) / 5) * 0.5) * 100));
    case 'Collector':
      return Math.min(100, Math.round(((Math.min(streak, 100) / 100) * 0.5 + (Math.min(tests, 1) / 1) * 0.5) * 100));
    case 'Secretary':
      return Math.min(100, Math.round(((Math.min(streak, 200) / 200) * 0.4 + (rank <= 500 ? 0.3 : 0) + (Math.min(referrals, 3) / 3) * 0.3) * 100));
    default:
      return 0;
  }
}

export function getRankRequirements(rank: OfficerRank): string[] {
  switch (rank) {
    case 'ASO':
      return ['Join PrepX'];
    case 'Deputy Collector':
      return ['7-day streak', '50 correct answers'];
    case 'Collector':
      return ['30-day streak', '5 essays scored >70%'];
    case 'Secretary':
      return ['100-day streak', '1 mock test completed'];
    case 'Cabinet Secretary':
      return ['200-day streak', 'Predicted rank top 500', '3 referrals'];
    default:
      return [];
  }
}
