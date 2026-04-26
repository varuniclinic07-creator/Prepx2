import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { evaluateMainsAnswer } from '@/lib/mains-evaluator';
import { awardCoins } from '@/lib/coins';

// AC-09: Submit essay → evaluate → check if both done → compute winner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { match_id, essay_text } = body;
    if (!match_id || !essay_text || typeof essay_text !== 'string') {
      return NextResponse.json({ error: 'match_id and essay_text required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Insert submission with AI scores
    const scores = evaluateMainsAnswer(essay_text);
    const wordCount = essay_text.trim().split(/\s+/).length;

    const { data: sub, error: subErr } = await supabase.from('essay_colosseum_submissions')
      .insert({ match_id, user_id: user.id, essay_text, word_count: wordCount, scores })
      .select()
      .single();

    if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });

    // Check if both players have submitted
    const { data: allSubs, error: countErr } = await supabase
      .from('essay_colosseum_submissions')
      .select('*')
      .eq('match_id', match_id);

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 });

    if (allSubs && allSubs.length >= 2) {
      // Both submitted → evaluate and close
      const s1 = allSubs[0];
      const s2 = allSubs[1];

      const sc1 = (s1.scores?.overall as number) ?? 0;
      const sc2 = (s2.scores?.overall as number) ?? 0;
      const winnerId = sc1 > sc2 ? s1.user_id : sc2 > sc1 ? s2.user_id : null;
      const winnerScore = sc1 > sc2 ? sc1 : sc2 > sc1 ? sc2 : sc1;
      const verdict = {
        winner_user_id: winnerId,
        winner_score: winnerScore,
        player_a: { user_id: s1.user_id, scores: s1.scores, word_count: s1.word_count },
        player_b: { user_id: s2.user_id, scores: s2.scores, word_count: s2.word_count },
        reasoning: sc1 > sc2
          ? `Player A wins with overall score ${sc1} vs ${sc2}. Player A demonstrated stronger argumentation and structure.`
          : sc2 > sc1
          ? `Player B wins with overall score ${sc2} vs ${sc1}. Player B demonstrated stronger argumentation and structure.`
          : `Both players tied with score ${sc1}. Well matched!`,
      };

      await supabase.from('essay_colosseum_matches')
        .update({ status: 'closed', winner_user_id: winnerId, ai_verdict: verdict, completed_at: new Date().toISOString() })
        .eq('id', match_id);

      // Award winner 500 coins
      if (winnerId) {
        await awardCoins(winnerId, 500, `Essay Colosseum victory`, `essay-${match_id}`);
      }

      return NextResponse.json({ submitted: sub, verdict, match_closed: true });
    }

    return NextResponse.json({ submitted: sub, match_closed: false });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
