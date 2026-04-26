import { supabase } from './supabase';
import { QuizTask } from '../types';

export async function generateDailyPlan(userId: string): Promise<QuizTask[]> {
  const today = new Date().toISOString().split('T')[0];

  // Fetch weak areas and attempted topics
  const [{ data: weakAreas }, { data: attempts }, { data: sessions }] = await Promise.all([
    supabase.from('user_weak_areas').select('topic_id').eq('user_id', userId),
    supabase.from('quiz_attempts').select('quiz_id').eq('user_id', userId),
    supabase.from('user_sessions').select('session_state').eq('user_id', userId).single(),
  ]);

  const weakTopicIds = (weakAreas || []).map(w => w.topic_id);

  // Get quiz-topic mapping for attempted topics
  let attemptedTopicIds: string[] = [];
  if (attempts && attempts.length > 0) {
    const quizIds = attempts.map(a => a.quiz_id);
    const { data: quizzes } = await supabase.from('quizzes').select('topic_id').in('id', quizIds);
    attemptedTopicIds = (quizzes || []).map(q => q.topic_id);
  }

  // Fetch candidate topics: unattempted OR weak, ordered by weak priority
  const { data: allTopics } = await supabase
    .from('topics')
    .select('id, subject')
    .order('created_at', { ascending: true })
    .limit(50);

  const candidateTopics = (allTopics || []).filter(
    t => !attemptedTopicIds.includes(t.id) || weakTopicIds.includes(t.id)
  );

  const newTopics = candidateTopics.filter(t => !attemptedTopicIds.includes(t.id)).slice(0, 2);
  const reviewTopics = candidateTopics.filter(t => weakTopicIds.includes(t.id)).slice(0, 1);

  // Build tasks
  const tasks: QuizTask[] = [];
  newTopics.forEach(t => tasks.push({ topic_id: t.id, type: 'read', duration: 20, status: 'pending' }));
  reviewTopics.forEach(t => tasks.push({ topic_id: t.id, type: 'review', duration: 15, status: 'pending' }));
  if (newTopics.length > 0) {
    tasks.push({ topic_id: newTopics[0].id, type: 'quiz', duration: 10, status: 'pending' });
  } else if (reviewTopics.length > 0) {
    tasks.push({ topic_id: reviewTopics[0].id, type: 'quiz', duration: 10, status: 'pending' });
  }

  // Ensure at least 3 tasks (fallback to any unattempted topic)
  if (tasks.length < 3) {
    const fallback = (allTopics || []).find(t => !tasks.some(task => task.topic_id === t.id));
    if (fallback) {
      tasks.push({ topic_id: fallback.id, type: 'read', duration: 20, status: 'pending' });
      tasks.push({ topic_id: fallback.id, type: 'quiz', duration: 10, status: 'pending' });
    }
  }

  return tasks;
}
