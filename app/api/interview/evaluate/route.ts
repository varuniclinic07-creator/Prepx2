import { NextResponse } from 'next/server';
import { aiChat } from '@/lib/ai-router';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({ question: z.string().min(1).max(10000), answer: z.string().min(1).max(10000) });

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });
  const { question, answer } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const prompt = `Evaluate this UPSC mock interview answer using SAR (Situation-Action-Result) rubric.\n\nQuestion: ${question}\nAnswer: ${answer}\n\nReturn ONLY a JSON object with this exact structure:\n{\n  "fluency": <0-10>,\n  "content": <0-10>,\n  "presence": <0-10>,\n  "feedback": "<2-3 sentence constructive feedback>"\n}`;

  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: 'You are a UPSC interview evaluator. Score answers 0-10 on fluency, content, presence of mind. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      jsonMode: true, temperature: 0.3, maxTokens: 600,
    });
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      fluency: Math.min(10, Math.max(0, Math.round(parsed.fluency || 5))),
      content: Math.min(10, Math.max(0, Math.round(parsed.content || 5))),
      presence: Math.min(10, Math.max(0, Math.round(parsed.presence || 5))),
      feedback: parsed.feedback || 'Good attempt. Continue practicing.',
    });
  } catch (err: any) {
    console.error('[Interview API] AI error:', err?.message);
    return NextResponse.json({ fluency: 5, content: 5, presence: 5, feedback: 'AI evaluation temporarily unavailable. Fallback scores provided.' }, { status: 200 });
  }
}
