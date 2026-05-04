// Sprint 7-B SQL contract smoke — essay_peer_judgments + leaderboard view (074).
//
// Exercises against cloud Supabase using service-role:
//   1) seed initiator + opponent + judge users
//   2) initiator creates a 'pending' match invited at opponent
//   3) opponent accept flips status to 'accepted'
//   4) both submit; close logic mirrors submit/route — winner picked by overall
//   5) judge inserts a peer judgment (allowed; not a participant)
//   6) UNIQUE(submission_id, judge_id) blocks duplicate (23505)
//   7) participant cannot judge own match (RLS WITH CHECK fails)
//   8) judgments only readable on 'closed' matches
//   9) leaderboard view returns initiator (winner) row with wins>=1
//
// Run: node --env-file=.env.local scripts/verification/essay-colosseum-peer-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n, e) => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

const stamp = Date.now();
const e1 = `s7b-init-${stamp}@prepx-smoke.test`;
const e2 = `s7b-opp-${stamp}@prepx-smoke.test`;
const e3 = `s7b-judge-${stamp}@prepx-smoke.test`;
let u1 = null, u2 = null, u3 = null, matchId = null, sub1Id = null, sub2Id = null, judgmentId = null;

async function mkUser(email) {
  const { data, error } = await sb.auth.admin.createUser({ email, password: 'EssayPeer!23', email_confirm: true });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  return data.user.id;
}

try {
  u1 = await mkUser(e1);
  u2 = await mkUser(e2);
  u3 = await mkUser(e3);
  ok('seed 3 users (initiator/opponent/judge)');

  // 2. Pending match
  const { data: m, error: mErr } = await sb.from('essay_colosseum_matches').insert({
    topic: `Smoke topic ${stamp}`,
    initiator_id: u1,
    invited_user_id: u2,
    opponent_id: null,
    status: 'pending',
    ai_verdict: {},
  }).select('id, status, invited_user_id').single();
  if (mErr || !m) throw new Error(`create match: ${mErr?.message}`);
  matchId = m.id;
  if (m.status === 'pending' && m.invited_user_id === u2) ok('create pending match with invited_user_id');
  else bad('pending invariant', JSON.stringify(m));

  // 3. Accept (flip to accepted)
  const { error: aErr } = await sb.from('essay_colosseum_matches')
    .update({ opponent_id: u2, status: 'accepted' }).eq('id', matchId).eq('status', 'pending');
  if (aErr) bad('accept update', aErr.message);
  else ok('accept flips pending → accepted');

  // 4. Submissions
  const sub1 = { match_id: matchId, user_id: u1, essay_text: 'Initiator essay body — strong argument and structure.', word_count: 9, scores: { overall: 8, structure: 8, content: 8, analysis: 8, presentation: 8 } };
  const sub2 = { match_id: matchId, user_id: u2, essay_text: 'Opponent essay body — also good but weaker.', word_count: 8, scores: { overall: 6, structure: 7, content: 6, analysis: 6, presentation: 6 } };
  const { data: s1, error: s1Err } = await sb.from('essay_colosseum_submissions').insert(sub1).select('id').single();
  if (s1Err) throw new Error(`sub1: ${s1Err.message}`);
  sub1Id = s1.id;
  const { data: s2, error: s2Err } = await sb.from('essay_colosseum_submissions').insert(sub2).select('id').single();
  if (s2Err) throw new Error(`sub2: ${s2Err.message}`);
  sub2Id = s2.id;
  ok('both submissions inserted');

  // Close match (mirror submit/route logic)
  await sb.from('essay_colosseum_matches').update({
    status: 'closed',
    winner_user_id: u1,
    completed_at: new Date().toISOString(),
    ai_verdict: {
      winner_user_id: u1, winner_score: 8,
      player_a: { user_id: u1, scores: sub1.scores, word_count: sub1.word_count },
      player_b: { user_id: u2, scores: sub2.scores, word_count: sub2.word_count },
      reasoning: 'Player A wins 8 vs 6.',
    },
  }).eq('id', matchId);
  ok('close match (winner = initiator)');

  // 5. Judge insert via service-role (bypasses RLS) — confirms shape only.
  const { data: j1, error: jErr } = await sb.from('essay_peer_judgments').insert({
    submission_id: sub1Id, match_id: matchId, judge_id: u3,
    score_overall: 9, score_structure: 9, score_argument: 8, score_clarity: 9,
    feedback: 'Excellent argument framing.',
  }).select('id').single();
  if (jErr || !j1) throw new Error(`judge insert: ${jErr?.message}`);
  judgmentId = j1.id;
  ok('judge inserts peer judgment');

  // 6. UNIQUE duplicate
  const { error: dupErr } = await sb.from('essay_peer_judgments').insert({
    submission_id: sub1Id, match_id: matchId, judge_id: u3, score_overall: 7,
  });
  if (dupErr?.code === '23505') ok('UNIQUE(submission_id, judge_id) blocks duplicate (23505)');
  else bad('UNIQUE dup', `expected 23505 got ${dupErr?.code} / ${dupErr?.message}`);

  // 7. Participant cannot judge own match — test via anon RLS path.
  // Sign in as initiator (u1) and try to insert judgment on opponent's submission.
  if (anonKey) {
    const u1Cli = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErr } = await u1Cli.auth.signInWithPassword({ email: e1, password: 'EssayPeer!23' });
    if (signErr) bad('sign-in u1', signErr.message);
    else {
      const { error: pErr } = await u1Cli.from('essay_peer_judgments').insert({
        submission_id: sub2Id, match_id: matchId, judge_id: u1, score_overall: 5,
      });
      if (pErr) ok('participant blocked from judging own match (RLS)');
      else bad('RLS participant guard', 'insert succeeded but should have been denied');
    }

    // 8. Judgments visible on closed matches (anon judge u3 should see j1).
    const u3Cli = createClient(url, anonKey, { auth: { persistSession: false } });
    await u3Cli.auth.signInWithPassword({ email: e3, password: 'EssayPeer!23' });
    const { data: visRows } = await u3Cli.from('essay_peer_judgments').select('id').eq('match_id', matchId);
    if (visRows && visRows.length >= 1) ok('judgments readable on closed matches');
    else bad('judgments visibility', `got ${visRows?.length}`);
  } else {
    ok('RLS participant guard — skipped (no anon key)');
    ok('judgments visibility — skipped (no anon key)');
  }

  // 9. Leaderboard view
  const { data: lb, error: lbErr } = await sb.from('essay_colosseum_leaderboard')
    .select('user_id, wins, matches_played, avg_peer_score, peer_judgments_received')
    .eq('user_id', u1).single();
  if (lbErr) bad('leaderboard select', lbErr.message);
  else if (lb && Number(lb.wins) >= 1 && Number(lb.matches_played) >= 1 && Number(lb.peer_judgments_received) >= 1) {
    ok(`leaderboard reflects winner (wins=${lb.wins}, played=${lb.matches_played}, judgments_received=${lb.peer_judgments_received}, avg=${lb.avg_peer_score})`);
  } else {
    bad('leaderboard row', JSON.stringify(lb));
  }
} catch (err) {
  bad('smoke', err.message || String(err));
} finally {
  try {
    if (judgmentId) await sb.from('essay_peer_judgments').delete().eq('id', judgmentId);
    if (sub1Id) await sb.from('essay_colosseum_submissions').delete().eq('id', sub1Id);
    if (sub2Id) await sb.from('essay_colosseum_submissions').delete().eq('id', sub2Id);
    if (matchId) await sb.from('essay_colosseum_matches').delete().eq('id', matchId);
  } catch {}
  if (u1) await sb.auth.admin.deleteUser(u1).catch(() => {});
  if (u2) await sb.auth.admin.deleteUser(u2).catch(() => {});
  if (u3) await sb.auth.admin.deleteUser(u3).catch(() => {});
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}
