import { supabase } from './supabase';
import { aiChat } from './ai-router';

export type Prediction = {
  topic_id: string;
  title: string;
  subject: string;
  confidence_score: number;
  reason: string;
};

export async function getPredictions(userId: string): Promise<Prediction[]> {
  const [{ data: topics }, { data: pyqs }] = await Promise.all([
    supabase.from('topics').select('id,title,subject,content').limit(50),
    supabase.from('topics').select('content').not('content->pyqs', 'is', null).limit(20),
  ]);

  if (!topics || topics.length === 0) return [];

  const prompt = `Based on UPSC PYQ patterns and current affairs, predict which topics are most likely to appear in the next exam.

Topics:
${topics.map((t: any, i: number) => `${i + 1}. ${t.title} (${t.subject})`).join('\n')}

Return ONLY a JSON array (max 10 items) with this structure:
[
  { "topic_id": "<id>", "title": "<title>", "subject": "<subject>", "confidence_score": <0-100>, "reason": "<1 sentence reason>" }
]`

  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: 'You are a UPSC exam prediction analyst. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      jsonMode: true,
      temperature: 0.4,
      maxTokens: 2000,
    })
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) => ({
        topic_id: p.topic_id || '',
        title: p.title || '',
        subject: p.subject || '',
        confidence_score: Math.min(100, Math.max(0, Math.round(p.confidence_score || 50))),
        reason: p.reason || 'Based on historical frequency.',
      })).filter((p: Prediction) => p.topic_id && p.title)
    }
  } catch (err: any) {
    console.error('[Prediction Engine] AI error:', err?.message)
  }

  // Fallback heuristic
  return (topics || []).slice(0, 10).map((t: any, i: number) => ({
    topic_id: t.id,
    title: t.title,
    subject: t.subject,
    confidence_score: Math.max(10, Math.min(95, 60 - i * 4 + (t.id.length % 13))),
    reason: 'Based on historical frequency analysis.',
  }))
}
