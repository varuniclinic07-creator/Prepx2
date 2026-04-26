import { NextResponse } from 'next/server';
import { evaluateMainsAnswer, MainsScores } from '@/lib/mains-evaluator';
import { aiChat } from '@/lib/ai-router';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ question_id: z.string().uuid(), answer_text: z.string().min(1).max(10000) });

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
    const { question_id, answer_text } = parsed.data;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let scores: MainsScores;
    try {
      const aiResponse = await aiChat({
        messages: [
          { role: 'system', content: 'You are a UPSC Mains answer evaluator. Score the answer on structure, content, analysis, presentation, overall. Return ONLY JSON with keys: structure, content, analysis, presentation, overall. Each is a number 0-10.' },
          { role: 'user', content: `Evaluate this answer:\n\n${answer_text}` },
        ],
        temperature: 0.2, maxTokens: 600, jsonMode: true,
      });
      const parsedAI = JSON.parse(aiResponse);
      scores = {
        structure: Math.min(10, Math.max(0, Number(parsedAI.structure) || 0)),
        content: Math.min(10, Math.max(0, Number(parsedAI.content) || 0)),
        analysis: Math.min(10, Math.max(0, Number(parsedAI.analysis) || 0)),
        presentation: Math.min(10, Math.max(0, Number(parsedAI.presentation) || 0)),
        overall: Math.min(10, Math.max(0, Number(parsedAI.overall) || 0)),
      };
    } catch {
      scores = evaluateMainsAnswer(answer_text);
    }
    return NextResponse.json({ scores });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Evaluation failed' }, { status: 500 });
  }
}
