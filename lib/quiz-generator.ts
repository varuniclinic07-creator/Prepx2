import { supabase } from './supabase';
import { generateQuiz } from './ai-router';

export async function generateAndSaveQuiz(topicId: string): Promise<{ success: boolean; quizId?: string; error?: string }> {
  try {
    const { data: topic } = await supabase.from('topics').select('*').eq('id', topicId).single();
    if (!topic) return { success: false, error: 'Topic not found' };

    // Check if quiz already exists
    const { data: existing } = await supabase.from('quizzes').select('id').eq('topic_id', topicId).single();
    if (existing) return { success: false, error: 'Quiz already exists for this topic' };

    // Generate via AI router
    const questions = await generateQuiz(topic.title, JSON.stringify(topic.content), 5);
    if (!questions || questions.length === 0) {
      return { success: false, error: 'AI returned empty quiz' };
    }

    const { data: quiz, error } = await supabase.from('quizzes').insert({
      topic_id: topicId,
      questions,
      generated_at: new Date().toISOString(),
    }).select().single();

    if (error) return { success: false, error: error.message };
    return { success: true, quizId: quiz.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateQuizzesForAllTopics(): Promise<{ generated: number; failed: number; errors: string[] }> {
  const { data: topics } = await supabase.from('topics').select('id');
  if (!topics) return { generated: 0, failed: 0, errors: [] };

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of topics) {
    const res = await generateAndSaveQuiz(t.id);
    if (res.success) generated++;
    else { failed++; if (res.error) errors.push(res.error); }
  }

  return { generated, failed, errors };
}

export async function generateQuizzesForSubject(subjectId: string): Promise<{ generated: number; failed: number; errors: string[] }> {
  const { data: topics } = await supabase.from('topics').select('id').eq('subject', subjectId);
  if (!topics || topics.length === 0) return { generated: 0, failed: 0, errors: ['No topics found for subject'] };

  let generated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const t of topics) {
    const res = await generateAndSaveQuiz(t.id);
    if (res.success) generated++;
    else { failed++; if (res.error) errors.push(res.error); }
  }

  return { generated, failed, errors };
}
