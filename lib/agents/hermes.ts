import type { SupabaseClient } from '@supabase/supabase-js';

// State-machine surface only. Safe for client + server import.
// Queue/dispatch logic (BullMQ-touching) lives in lib/agents/hermes-dispatch.ts
// and must NEVER be imported from a client component.

export const HERMES_STATES = [
  'idle','planning','ready','studying','quizzing','feedback','adapting','done'
] as const;

export type HermesState = typeof HERMES_STATES[number];

export interface HermesContext {
  user_id: string;
  session_state: HermesState;
  current_topic_id?: string;
  current_quiz_id?: string;
  current_essay_id?: string;
  current_interview_id?: string;
  daily_plan_id?: string;
  last_activity_at: string;
}

export async function createSession(supabase: SupabaseClient, userId: string): Promise<HermesContext> {
  const ctx: HermesContext = {
    user_id: userId,
    session_state: 'idle',
    last_activity_at: new Date().toISOString()
  };
  await supabase.from('user_sessions').upsert(ctx, { onConflict: 'user_id' });
  return ctx;
}

export async function transition(
  supabase: SupabaseClient,
  userId: string,
  newState: HermesState,
  payload?: Record<string,any>
) {
  const update: Record<string,any> = {
    session_state: newState,
    last_activity_at: new Date().toISOString()
  };
  if (payload?.topicId) update.current_topic_id = payload.topicId;
  if (payload?.quizId) update.current_quiz_id = payload.quizId;
  if (payload?.essayId) update.current_essay_id = payload.essayId;
  if (payload?.interviewId) update.current_interview_id = payload.interviewId;
  if (payload?.dailyPlanId) update.daily_plan_id = payload.dailyPlanId;

  await supabase.from('user_sessions').update(update).eq('user_id', userId);
}

export async function resumeSession(supabase: SupabaseClient, userId: string): Promise<HermesContext | null> {
  const { data } = await supabase.from('user_sessions').select('*').eq('user_id', userId).single();
  if (!data) return null;
  return data as unknown as HermesContext;
}

export async function getAllowedActions(state: HermesState): Promise<string[]> {
  switch (state) {
    case 'idle': return ['start_onboarding','view_dashboard'];
    case 'planning': return ['view_plan','start_studying'];
    case 'ready': return ['open_topic'];
    case 'studying': return ['take_quiz'];
    case 'quizzing': return ['submit'];
    case 'feedback': return ['review_weak_areas','continue'];
    case 'adapting': return ['view_next_plan'];
    case 'done': return ['start_new_day'];
    default: return [];
  }
}
