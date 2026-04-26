import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, DailyPlan, Topic, Quiz, QuizAttempt, WeakArea } from '../types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
} catch {
  // Mock client for E2E/CI without real Supabase credentials
  const createChain = () => ({
    eq: () => createChain(),
    order: () => createChain(),
    limit: () => createChain(),
    single: () => Promise.resolve({ data: null, error: null }),
  });
  const mockDb = () => ({
    select: () => createChain(),
    insert: () => Promise.resolve({ data: null, error: null }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    upsert: () => Promise.resolve({ data: null, error: null }),
  });
  supabase = {
    from: mockDb,
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    },
  } as any;
}

export { supabase };

// === User Profile ===
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return { id: data.id, email: data.email, subscription_status: data.subscription_status,
    role: data.role, baseline_score: data.baseline_score,
    weak_areas: data.weak_areas || [], streak_count: data.streak_count || 0 };
}

export async function updateUserProfile(userId: string, profile: Partial<UserProfile>) {
  return supabase.from('users').update(profile).eq('id', userId);
}

// === Daily Plans ===
export async function getDailyPlan(userId: string, date: string): Promise<DailyPlan | null> {
  const { data } = await supabase
    .from('daily_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('plan_date', date)
    .single();
  if (!data) return null;
  return { id: data.id, user_id: data.user_id, plan_date: data.plan_date,
    tasks: data.tasks || [], status: data.status };
}

export async function createDailyPlan(userId: string, tasks: DailyPlan['tasks']): Promise<DailyPlan | null> {
  const planDate = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_plans')
    .insert({ user_id: userId, plan_date: planDate, tasks, status: 'pending' })
    .select()
    .single();
  if (!data) return null;
  return { id: data.id, user_id: data.user_id, plan_date: data.plan_date,
    tasks: data.tasks || [], status: data.status };
}

export async function updatePlanStatus(planId: string, status: DailyPlan['status']) {
  return supabase.from('daily_plans').update({ status }).eq('id', planId);
}

// === Topics ===
export async function getTopic(topicId: string): Promise<Topic | null> {
  const { data } = await supabase.from('topics').select('*').eq('id', topicId).single();
  if (!data) return null;
  return { id: data.id, title: data.title, subject: 'polity',
    syllabus_tag: data.syllabus_tag, content: data.content,
    readability_score: data.readability_score,  };
}

export async function getTopicBySyllabusTag(tag: string): Promise<Topic | null> {
  const { data } = await supabase.from('topics').select('*').eq('syllabus_tag', tag).single();
  if (!data) return null;
  return { id: data.id, title: data.title, subject: 'polity',
    syllabus_tag: data.syllabus_tag, content: data.content,
    readability_score: data.readability_score,  };
}

// === Quizzes ===
export async function getQuizByTopic(topicId: string): Promise<Quiz | null> {
  const { data } = await supabase.from('quizzes').select('*').eq('topic_id', topicId).single();
  if (!data) return null;
  return { id: data.id, topic_id: data.topic_id, questions: data.questions || [] };
}

export async function createQuizAttempt(userId: string, quizId: string, answers: QuizAttempt['answers'],
  errorBreakdown: QuizAttempt['error_breakdown'], diagnosis?: string): Promise<string | null> {
  const { data } = await supabase.from('quiz_attempts').insert({
    user_id: userId, quiz_id: quizId, answers, error_breakdown: errorBreakdown, diagnosis
  }).select().single();
  return data?.id || null;
}

// === Weak Areas ===
export async function getWeakAreas(userId: string): Promise<WeakArea[]> {
  const { data } = await supabase.from('user_weak_areas').select('*').eq('user_id', userId);
  return (data || []).map((d: any) => ({
    id: d.id, user_id: d.user_id, topic_id: d.topic_id,
    gap_type: d.gap_type, severity: d.severity,
    detected_at: d.detected_at, auto_injected_at: d.auto_injected_at
  }));
}

export async function createWeakArea(userId: string, topicId: string, gapType: string, severity: number) {
  return supabase.from('user_weak_areas').upsert({
    user_id: userId, topic_id: topicId, gap_type: gapType, severity, detected_at: new Date().toISOString()
  });
}

// === Activity Log (OMTM Telemetry) ===
export async function logEvent(userId: string, eventType: string, metadata: Record<string, unknown> = {}) {
  return supabase.from('activity_log').insert({ user_id: userId, event_type: eventType, metadata });
}
// === Mains Attempts ===
export async function createMainsAttempt(
  userId: string,
  record: { question_id: string; answer_text: string; scores: any; word_count: number; duration_seconds: number }
) {
  const { data } = await supabase.from('mains_attempts')
    .insert({ user_id: userId, ...record })
    .select()
    .single();
  return data;
}

export async function getMainsAttempts(userId: string, limit = 5) {
  const { data } = await supabase.from('mains_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
