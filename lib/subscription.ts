import { supabase } from './supabase';

export type Plan = 'free' | 'premium' | 'premium_plus';

const PLAN_RANK: Record<Plan, number> = {
  free: 0,
  premium: 1,
  premium_plus: 2,
};

export function hasFeature(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const { data } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', userId)
    .single();
  return (data?.subscription_status as Plan) || 'free';
}

export async function canUseFeature(userId: string, featureName: string): Promise<boolean> {
  const userPlan = await getUserPlan(userId);
  const { data: features } = await supabase
    .from('feature_flags')
    .select('flag_name, enabled_for');
  const gate = (features || []).find((f: any) => f.flag_name === featureName);
  if (!gate) return true;
  return hasFeature(userPlan, gate.enabled_for as Plan);
}
