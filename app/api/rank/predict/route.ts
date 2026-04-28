import { NextResponse } from 'next/server';
import { getRankPrediction } from '@/lib/rank-oracle';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

const PredictSchema = z.object({ user_id: z.string().uuid().optional() });

export async function POST(req: Request) {
  try {
    let body: unknown;
    try { body = await req.json(); } catch { body = {}; }
    const parsed = PredictSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((e: any) => e.message).join(', ') }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const targetUserId = parsed.data.user_id || user.id;
    // FIX 2.4: IDOR check
    if (targetUserId !== user.id) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const prediction = await getRankPrediction(supabase, targetUserId);
    await supabase.from('user_predictions').insert({
      user_id: targetUserId,
      predicted_rank_min: prediction.predicted_rank_min,
      predicted_rank_max: prediction.predicted_rank_max,
      confidence_pct: prediction.confidence_pct,
      deficit_gaps: prediction.deficit_gaps,
      days_to_cutoff: prediction.days_to_cutoff,
    });
    return NextResponse.json(prediction);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Prediction failed' }, { status: 500 });
  }
}
