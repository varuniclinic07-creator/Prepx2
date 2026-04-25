import { supabase } from './supabase';

export type Plan = 'free' | 'premium' | 'premium_plus';

const PLAN_RANK: Record<Plan, number> = { free: 0, premium: 1, premium_plus: 2 };

export function hasFeature(userPlan: Plan, requiredPlan: Plan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export async function getUserPlan(userId: string): Promise<Plan> {
  const { data } = await supabase.from('users').select('subscription_status').eq('id', userId).single();
  return (data?.subscription_status as Plan) || 'free';
}

export async function getFeatureGates(): Promise<Record<string, Plan>> {
  const { data } = await supabase.from('feature_flags').select('flag_name,enabled_for');
  const map: Record<string, Plan> = {};
  if (data) data.forEach((r: any) => { map[r.flag_name] = r.enabled_for; });
  return map;
}

export async function canUseFeature(userId: string, feature: string): Promise<boolean> {
  const [plan, gates] = await Promise.all([getUserPlan(userId), getFeatureGates()]);
  const required = gates[feature] || 'free';
  return hasFeature(plan, required);
}
