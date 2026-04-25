import { NextResponse } from 'next/server';
import { evaluateMainsAnswer, MainsScores } from '@/lib/mains-evaluator';
import { aiChat } from '@/lib/ai-router';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question_id, answer_text, user_id } = body;
    if (!question_id || !answer_text || !user_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    let scores: MainsScores;
    try {
      const aiResponse = await aiChat({
        messages: [
          { role: 'system', content: 'You are a UPSC Mains answer evaluator. Score the answer on structure, content, analysis, presentation, overall. Return ONLY JSON with keys: structure, content, analysis, presentation, overall. Each is a number 0-10.' },
          { role: 'user', content: `Evaluate this answer:\n\n${answer_text}` },
        ],
        temperature: 0.2,
        maxTokens: 600,
        jsonMode: true,
      });
      const parsed = JSON.parse(aiResponse);
      scores = {
        structure: Math.min(10, Math.max(0, Number(parsed.structure) || 0)),
        content: Math.min(10, Math.max(0, Number(parsed.content) || 0)),
        analysis: Math.min(10, Math.max(0, Number(parsed.analysis) || 0)),
        presentation: Math.min(10, Math.max(0, Number(parsed.presentation) || 0)),
        overall: Math.min(10, Math.max(0, Number(parsed.overall) || 0)),
      };
    } catch {
      scores = evaluateMainsAnswer(answer_text);
    }

    return NextResponse.json({ scores });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Evaluation failed' }, { status: 500 });
  }
}
