import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getRankPrediction } from '@/lib/rank-oracle';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const userId = body.user_id || user.id;

  try {
    const prediction = await getRankPrediction(userId);

    // Upsert into user_predictions
    await supabase.from('user_predictions').insert({
      user_id: userId,
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
