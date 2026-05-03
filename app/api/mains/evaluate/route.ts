import { NextResponse } from 'next/server';
import { evaluateMainsAnswer } from '@/lib/mains-evaluator';
import { aiChat } from '@/lib/ai-router';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const BodySchema = z.object({
  question_id: z.string().min(1).max(500),
  answer_text: z.string().min(1).max(10000),
});

interface DimResult {
  score: number;
  feedback: string;
}

interface AIEvaluation {
  structure: DimResult;
  content: DimResult;
  analysis: DimResult;
  presentation: DimResult;
  overall_score: number;
  summary: string;
  next_steps: string[];
}

const systemPrompt = `You are a UPSC Mains examiner with 25 years of experience.
Evaluate the answer on exactly 4 dimensions. Return ONLY valid JSON with this structure:
{
  "structure": { "score": 7, "feedback": "Intro is strong but conclusion is weak. Add a 2-sentence implication statement." },
  "content": { "score": 6, "feedback": "Good factual base but missing recent data from NITI Aayog 2024 / Census 2021." },
  "analysis": { "score": 5, "feedback": "Arguments need counter-points. Add trade-off analysis in the body paragraphs." },
  "presentation": { "score": 7, "feedback": "Clean paragraphing. Add subheadings for longer answers above 300 words." },
  "overall_score": 6.3,
  "summary": "Solid foundation but needs contemporary examples and stronger conclusion.",
  "next_steps": ["Add 2 recent government schemes as examples", "Write a stronger conclusion paragraph", "Practice counter-argument insertion"]
}
Scores are 0-10. Be specific and actionable.`;

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try { raw = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') }, { status: 400 });

    const { question_id, answer_text } = parsed.data;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!user || userError) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const word_count = answer_text.trim().split(/\s+/).filter(Boolean).length;

    let dimScores: { structure: number; content: number; analysis: number; presentation: number; overall: number };
    let feedback: { structure: string; content: string; analysis: string; presentation: string } | null = null;
    let summary: string | null = null;
    let next_steps: string[] = [];

    try {
      const aiResponse = await aiChat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Question context: ${question_id}\n\nAnswer to evaluate:\n\n${answer_text}` },
        ],
        temperature: 0.2,
        maxTokens: 900,
        jsonMode: true,
      });

      const ev: AIEvaluation = JSON.parse(aiResponse);

      const clamp = (v: unknown) => Math.min(10, Math.max(0, Number(v) || 0));

      dimScores = {
        structure: clamp(ev.structure?.score),
        content: clamp(ev.content?.score),
        analysis: clamp(ev.analysis?.score),
        presentation: clamp(ev.presentation?.score),
        overall: clamp(ev.overall_score),
      };

      feedback = {
        structure: String(ev.structure?.feedback ?? ''),
        content: String(ev.content?.feedback ?? ''),
        analysis: String(ev.analysis?.feedback ?? ''),
        presentation: String(ev.presentation?.feedback ?? ''),
      };

      summary = typeof ev.summary === 'string' ? ev.summary : null;
      next_steps = Array.isArray(ev.next_steps) ? ev.next_steps.map(String) : [];
    } catch {
      const heuristic = evaluateMainsAnswer(answer_text);
      dimScores = heuristic;
    }

    // Insert mains_attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from('mains_attempts')
      .insert({
        user_id: user.id,
        question_id,
        answer_text,
        scores: dimScores,
        word_count,
        duration_seconds: 0,
      })
      .select('id')
      .single();

    if (attemptErr || !attempt) {
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
    }

    // Insert answer_evaluation
    const { error: evalErr } = await supabase.from('answer_evaluations').insert({
      attempt_id: attempt.id,
      user_id: user.id,
      overall_score: dimScores.overall,
      structure_score: dimScores.structure,
      content_score: dimScores.content,
      analysis_score: dimScores.analysis,
      presentation_score: dimScores.presentation,
      structure_feedback: feedback?.structure ?? null,
      content_feedback: feedback?.content ?? null,
      analysis_feedback: feedback?.analysis ?? null,
      presentation_feedback: feedback?.presentation ?? null,
      summary,
      next_steps,
      word_count,
    });

    if (evalErr) {
      // Non-fatal: attempt is saved; return scores anyway
      console.error('answer_evaluations insert failed:', evalErr.message);
    }

    return NextResponse.json({
      attempt_id: attempt.id,
      scores: dimScores,
      feedback,
      summary,
      next_steps,
      word_count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Evaluation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
