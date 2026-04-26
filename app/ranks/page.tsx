import { createClient } from '@/lib/supabase-server';
import { getUserRank, getRankProgress, getRankRequirements, OfficerRank } from '@/lib/rank-progression';

export default async function RanksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-slate-100">Officer Rank Progression</h1>
        <p className="text-slate-400 mt-2">Log in to track your rank.</p>
      </div>
    );
  }

  const { current_rank, promoted_at } = await getUserRank(user.id);

  // Fetch user stats for progress
  const { data: userData } = await supabase.from('users').select('streak_count').eq('id', user.id).single();
  const { data: attempts } = await supabase.from('quiz_attempts').select('score').eq('user_id', user.id);
  const { data: essays } = await supabase.from('mains_attempts').select('scores').eq('user_id', user.id);
  const { data: preds } = await supabase.from('user_predictions').select('predicted_rank_max').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
  const { data: squads } = await supabase.from('squads').select('id').eq('created_by', user.id);
  const squadIds = (squads || []).map((s: any) => s.id);
  let referralCount = 0;
  if (squadIds.length > 0) {
    const { count } = await supabase.from('squad_members').select('*', { count: 'exact', head: true }).in('squad_id', squadIds);
    referralCount = count || 0;
  }

  const stats = {
    streak_count: userData?.streak_count || 0,
    correct_answers: (attempts || []).reduce((a: number, c: any) => a + (c.score || 0), 0),
    high_scoring_essays: (essays || []).filter((e: any) => (e.scores?.overall || 0) >= 7).length,
    mock_tests: (attempts || []).length > 0 ? 1 : 0,
    predicted_rank: preds?.predicted_rank_max || 9999,
    referrals: referralCount,
  };

  const progress = getRankProgress(current_rank, stats);
  const requirements = getRankRequirements(current_rank);

  // AC-12: Fetch promotion history from table
  const { data: history } = await supabase.from('user_office_ranks').select('*').eq('user_id', user.id);

  const rankMeta: Record<OfficerRank, { emoji: string; color: string; desc: string }> = {
    'ASO': { emoji: '📋', color: 'text-slate-400', desc: 'Assistant Section Officer — Entry Level' },
    'Deputy Collector': { emoji: '🛡️', color: 'text-emerald-400', desc: 'Deputy Collector — Field Administration' },
    'Collector': { emoji: '⚖️', color: 'text-blue-400', desc: 'Collector — District Authority' },
    'Secretary': { emoji: '🏛️', color: 'text-violet-400', desc: 'Secretary — Department Head' },
    'Cabinet Secretary': { emoji: '👑', color: 'text-amber-400', desc: 'Cabinet Secretary — Apex Rank' },
  };

  const meta = rankMeta[current_rank];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
          Officer Rank Progression
        </h1>
      </div>

      {/* Current rank card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <div className="text-6xl mb-3">{meta.emoji}</div>
        <h2 className={`text-2xl font-bold ${meta.color}`}>{current_rank}</h2>
        <p className="text-sm text-slate-400 mt-1">{meta.desc}</p>
        {promoted_at && (
          <p className="text-xs text-slate-500 mt-1">Promoted on {new Date(promoted_at).toLocaleDateString()}</p>
        )}
      </div>

      {/* Progress to next rank */}
      {current_rank !== 'Cabinet Secretary' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-3">Next Rank Progress</h3>
          <div className="w-full bg-slate-800 rounded-full h-4 mb-2">
            <div
              className="bg-gradient-to-r from-amber-500 to-rose-500 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 text-right">{progress}%</p>
          <div className="mt-3 space-y-2">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-emerald-400 text-sm">✓</span>
                <span className="text-sm text-slate-300">{req}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promotion history */}
      {history && history.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-3">Promotion History</h3>
          <div className="space-y-2">
            {history.map((h: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                <span>{rankMeta[(h.current_rank as OfficerRank)]?.emoji || '📋'}</span>
                <span className="font-semibold">{h.current_rank}</span>
                <span className="text-slate-500">— {new Date(h.promoted_at || h.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-400 mb-3">Share your achievement</p>
        <div className="bg-slate-800 rounded-lg p-4 inline-block">
          <p className="text-lg font-bold text-slate-100">
            🏅 I have been promoted to {current_rank} on "PrepX"
          </p>
        </div>
      </div>
    </div>
  );
}
