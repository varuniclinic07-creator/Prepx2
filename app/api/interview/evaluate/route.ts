import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { aiChat } from '@/lib/ai-router'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { question, answer } = await req.json()
  if (!question || !answer) return NextResponse.json({ error: 'Missing question or answer' }, { status: 400 })

  const prompt = `Evaluate this UPSC mock interview answer using SAR (Situation-Action-Result) rubric.

Question: ${question}
Answer: ${answer}

Return ONLY a JSON object with this exact structure:
{
  "fluency": <0-10>,
  "content": <0-10>,
  "presence": <0-10>,
  "feedback": "<2-3 sentence constructive feedback>"
}`

  try {
    const raw = await aiChat({
      messages: [
        { role: 'system', content: 'You are a UPSC interview evaluator. Score answers 0-10 on fluency, content, presence of mind. Return valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      jsonMode: true,
      temperature: 0.3,
      maxTokens: 600,
    })
    const parsed = JSON.parse(raw)
    return NextResponse.json({
      fluency: Math.min(10, Math.max(0, Math.round(parsed.fluency || 5))),
      content: Math.min(10, Math.max(0, Math.round(parsed.content || 5))),
      presence: Math.min(10, Math.max(0, Math.round(parsed.presence || 5))),
      feedback: parsed.feedback || 'Good attempt. Continue practicing.',
    })
  } catch (err: any) {
    console.error('[Interview API] AI error:', err?.message)
    return NextResponse.json({
      fluency: 5, content: 5, presence: 5,
      feedback: 'AI evaluation temporarily unavailable. Fallback scores provided.',
    }, { status: 200 })
  }
}
