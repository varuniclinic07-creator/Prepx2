import { supabase } from './supabase';
import { aiChat } from './ai-router';

export interface RankPrediction {
  predicted_rank_min: number;
  predicted_rank_max: number;
  confidence_pct: number;
  deficit_gaps: { subject: string; deficit_pct: number; tip: string }[];
  days_to_cutoff: number;
}

export async function getRankPrediction(userId: string): Promise<RankPrediction> {
  // Gather user stats
  const [{ data: attempts }, { data: answers }, { data: plans }, { data: weakAreas }, { data: profile }] = await Promise.all([
    supabase.from('quiz_attempts').select('*').eq('user_id', userId),
    supabase.from('mains_attempts').select('*').eq('user_id', userId),
    supabase.from('daily_plans').select('*').eq('user_id', userId).eq('status', 'completed'),
    supabase.from('user_weak_areas').select('*').eq('user_id', userId),
    supabase.from('users').select('streak_count').eq('id', userId).single(),
  ]);

  const totalQuizzes = (attempts || []).length;
  const correctCount = (attempts || []).reduce((sum: number, a: any) => {
    const answersArr = a.answers || [];
    return sum + (Array.isArray(answersArr) ? answersArr.filter((x: any) => x?.is_correct).length : 0);
  }, 0);
  const avgQuizAccuracy = totalQuizzes > 0 ? Math.round((correctCount / (totalQuizzes * 5)) * 100) : 0;

  const totalAnswers = (answers || []).length;
  const avgAnswerScore = totalAnswers > 0
    ? Math.round((answers || []).reduce((sum: number, a: any) => {
        const scores = a.scores || {};
        return sum + (scores?.overall ?? 0);
      }, 0) / totalAnswers * 10)
    : 0;

  const streak = profile?.streak_count ?? 0;
  const weakSubjects = [...new Set((weakAreas || []).map((w: any) => w.topic_id))];

  const prompt = `You are a UPSC AIR prediction engine. Given aspirant statistics, predict All India Rank (AIR) range, confidence, deficit gaps, and days to cutoff.

Stats:
- Quizzes attempted: ${totalQuizzes}
- Quiz accuracy: ${avgQuizAccuracy}%
- Essays written: ${totalAnswers}
- Avg essay score: ${avgAnswerScore}/100
- Study streak: ${streak} days
- Weak area topics count: ${weakSubjects.length}

Return ONLY a JSON object with:
{
  "predicted_rank_min": <positive_int>,
  "predicted_rank_max": <positive_int>,
  "confidence_pct": <0-100>,
  "deficit_gaps": [{"subject":"...","deficit_pct":<int>,"tip":"..."}],
  "days_to_cutoff": <positive_int>
}

Rules:
- If accuracy < 50 and essays < 3: rank > 5000, confidence < 30
- If accuracy 50-70: rank 1000-5000, confidence 30-60
- If accuracy > 70 and essays > 5: rank 100-1000, confidence > 60`;

  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: 'You return strict JSON only. No markdown, no explanation.' },
        { role: 'user', content: prompt },
      ],
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 800,
    });
    const parsed = JSON.parse(raw);
    return {
      predicted_rank_min: Math.max(1, Math.round(parsed.predicted_rank_min || 5000)),
      predicted_rank_max: Math.max(1, Math.round(parsed.predicted_rank_max || 10000)),
      confidence_pct: Math.max(0, Math.min(100, Math.round(parsed.confidence_pct || 30))),
      deficit_gaps: Array.isArray(parsed.deficit_gaps) ? parsed.deficit_gaps : [],
      days_to_cutoff: Math.max(1, Math.round(parsed.days_to_cutoff || 120)),
    };
  } catch (err) {
    // Fallback heuristic (AC: fallback when AI fails)
    let rankMin = 5000, rankMax = 10000, conf = 20;
    if (avgQuizAccuracy > 70 && totalAnswers > 5) { rankMin = 100; rankMax = 1000; conf = 65; }
    else if (avgQuizAccuracy > 50) { rankMin = 1500; rankMax = 5000; conf = 40; }
    return {
      predicted_rank_min: rankMin,
      predicted_rank_max: rankMax,
      confidence_pct: conf,
      deficit_gaps: [
        { subject: 'Overall Accuracy', deficit_pct: Math.max(0, 100 - avgQuizAccuracy), tip: 'Increase daily quiz volume.' },
        { subject: 'Essay Writing', deficit_pct: Math.max(0, 100 - avgAnswerScore), tip: 'Practice 1 answer daily.' },
        { subject: 'Consistency', deficit_pct: Math.max(0, 30 - streak), tip: 'Maintain daily streak.' },
      ],
      days_to_cutoff: avgQuizAccuracy > 60 ? 90 : 150,
    };
  }
}
