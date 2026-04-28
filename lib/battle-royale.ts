import type { SupabaseClient } from '@supabase/supabase-js';
import { awardCoins } from './coins';

export interface RoyaleEvent {
  id: string;
  event_start: string;
  status: 'scheduled' | 'live' | 'completed';
  prize_pool: number;
  question_count: number;
  current_question: number;
  quiz_id?: string;
}

export interface RoyaleParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  eliminated_at?: string;
  last_answer_correct?: boolean;
  score: number;
}

export async function createEvent(supabase: SupabaseClient, eventStart: string, questionCount = 20, prizePool = 1000, quizId?: string) {
  const { data, error } = await supabase
    .from('battle_royale_events')
    .insert({ event_start: eventStart, status: 'scheduled', question_count: questionCount, prize_pool: prizePool, quiz_id: quizId })
    .select()
    .single();
  if (error) throw error;
  return data as RoyaleEvent;
}

export async function joinEvent(supabase: SupabaseClient, eventId: string, userId: string) {
  const { data: existing } = await supabase
    .from('battle_royale_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();
  if (existing) return existing;

  const { data, error } = await supabase
    .from('battle_royale_participants')
    .insert({ event_id: eventId, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitAnswer(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
  _questionId: string,
  answer: string,
  correctOption: string
) {
  const { data: participant } = await supabase
    .from('battle_royale_participants')
    .select('id, eliminated_at, score')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();
  if (!participant) throw new Error('Not a participant');
  if (participant.eliminated_at) return { eliminated: true, correct: false };

  const correct = correctOption === answer;
  const now = new Date().toISOString();
  if (!correct) {
    await supabase
      .from('battle_royale_participants')
      .update({ eliminated_at: now, last_answer_correct: false })
      .eq('id', participant.id);
    return { eliminated: true, correct: false };
  }

  const newScore = (participant.score || 0) + 1;
  await supabase
    .from('battle_royale_participants')
    .update({ score: newScore, last_answer_correct: true })
    .eq('id', participant.id);

  return { eliminated: false, correct: true, score: newScore };
}

export async function getLeaderboard(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from('battle_royale_participants')
    .select('user_id, joined_at, eliminated_at, score, last_answer_correct')
    .eq('event_id', eventId)
    .order('score', { ascending: false })
    .order('eliminated_at', { ascending: true });
  return data || [];
}

export async function getEvent(supabase: SupabaseClient, eventId: string): Promise<RoyaleEvent | null> {
  const { data } = await supabase.from('battle_royale_events').select('*').eq('id', eventId).single();
  return data as RoyaleEvent | null;
}

export async function getActiveEvents(supabase: SupabaseClient): Promise<RoyaleEvent[]> {
  const { data } = await supabase
    .from('battle_royale_events')
    .select('*')
    .in('status', ['scheduled', 'live'])
    .order('event_start', { ascending: true });
  return (data as RoyaleEvent[]) || [];
}

export async function markEventLive(supabase: SupabaseClient, eventId: string) {
  return supabase.from('battle_royale_events').update({ status: 'live' }).eq('id', eventId);
}

export async function markEventCompleted(supabase: SupabaseClient, eventId: string) {
  const { data } = await supabase
    .from('battle_royale_participants')
    .select('user_id')
    .eq('event_id', eventId)
    .is('eliminated_at', null)
    .order('score', { ascending: false })
    .limit(1)
    .single();

  if (data?.user_id) {
    await awardCoins(supabase, data.user_id, 1000, 'battle_royale_winner', `br-win-${eventId}`);
  }

  return supabase.from('battle_royale_events').update({ status: 'completed' }).eq('id', eventId);
}
