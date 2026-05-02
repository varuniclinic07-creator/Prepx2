// Verifies the SQL contract for Epic 1.5 Weak-Area Auto-Injection.
//   1) Create a test auth user + topic
//   2) Insert 3 weak_areas (severities 5, 3, 1) within 72h window
//   3) Call inject_weak_areas_for_plan → expect 3 rows ordered by severity desc, auto_injected_at stamped
//   4) Call again → expect 0 rows (no re-injection)
//   5) Insert a row detected 80h ago, never injected
//   6) Call expire_stale_weak_areas → expect >=1 row marked expired
//   7) Cleanup: delete weak_areas, topic, user
//
// Run: node --env-file=.env.local scripts/verification/weak-area-injection-smoke.mjs

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log(`  PASS  ${name}`); };
const bad = (name, err) => { fail++; console.error(`  FAIL  ${name}: ${err}`); };

async function main() {
  console.log('— Weak-area injection smoke —');

  let userId, topicId;
  const weakIds = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    // 1a. Create test user
    const email = `weak-smoke-${randomUUID().slice(0, 8)}@prepx.test`;
    const { data: created, error: userErr } = await sb.auth.admin.createUser({
      email,
      password: randomUUID(),
      email_confirm: true,
    });
    if (userErr || !created?.user) return bad('createUser', userErr?.message ?? 'no user');
    userId = created.user.id;
    ok(`createUser ${userId.slice(0, 8)}`);

    // 1b. Create test topic
    const { data: topic, error: tErr } = await sb
      .from('topics')
      .insert({
        title: 'WeakAreaSmoke Topic',
        subject: 'polity',
        syllabus_tag: 'gs2-polity',
        content: { summary: 'smoke-fixture' },
      })
      .select('id')
      .single();
    if (tErr || !topic) return bad('insert topic', tErr?.message ?? 'no row');
    topicId = topic.id;
    ok(`insert topic ${topicId.slice(0, 8)}`);

    // 2. Insert 3 fresh weak_areas (severities 5, 3, 1)
    const severities = [5, 3, 1];
    const gapTypes = ['concept', 'silly', 'time'];
    for (let i = 0; i < 3; i++) {
      const { data, error } = await sb
        .from('user_weak_areas')
        .insert({
          user_id: userId,
          topic_id: topicId,
          gap_type: gapTypes[i],
          severity: severities[i],
          // detected_at defaults to NOW() — fresh.
        })
        .select('id')
        .single();
      if (error || !data) return bad(`insert weak_area #${i + 1}`, error?.message ?? 'no row');
      weakIds.push(data.id);
    }
    ok('insert 3 fresh weak_areas');

    // 3. Inject — expect 3 rows ordered by severity desc, auto_injected_at stamped
    const { data: injected, error: injErr } = await sb.rpc('inject_weak_areas_for_plan', {
      p_user_id: userId,
      p_plan_date: today,
    });
    if (injErr) return bad('inject_weak_areas_for_plan', injErr.message);
    if (!Array.isArray(injected) || injected.length !== 3) {
      return bad('inject returns 3 rows', `got ${injected?.length ?? 0}`);
    }
    if (injected[0].severity !== 5) {
      return bad('inject orders by severity desc', `top severity=${injected[0].severity}`);
    }
    ok('inject returns 3 rows ordered by severity desc');

    const { data: stamped } = await sb
      .from('user_weak_areas')
      .select('id, auto_injected_at')
      .in('id', weakIds);
    const stampedCount = (stamped ?? []).filter((r) => r.auto_injected_at).length;
    if (stampedCount !== 3) return bad('all 3 rows stamped', `got ${stampedCount}`);
    ok('all 3 rows have auto_injected_at stamped');

    // 4. Call again — expect 0 rows
    const { data: injected2, error: inj2Err } = await sb.rpc('inject_weak_areas_for_plan', {
      p_user_id: userId,
      p_plan_date: today,
    });
    if (inj2Err) return bad('inject 2nd call', inj2Err.message);
    if ((injected2 ?? []).length !== 0) {
      return bad('inject 2nd call returns 0', `got ${injected2.length}`);
    }
    ok('2nd inject call returns 0 (no re-injection)');

    // 5. Insert a row detected 80h ago, never injected
    const eightyHoursAgo = new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString();
    const { data: stale, error: stErr } = await sb
      .from('user_weak_areas')
      .insert({
        user_id: userId,
        topic_id: topicId,
        gap_type: 'concept',
        severity: 2,
        detected_at: eightyHoursAgo,
      })
      .select('id')
      .single();
    // 23505 = (user, topic, 'concept') unique violation since we already inserted
    // a 'concept' row above. Insert with a different gap_type for the stale row.
    if (stErr && stErr.code === '23505') {
      // Retry with a fresh gap_type by deleting one of the prior 'concept' rows.
      // Simpler: manipulate one of the existing rows to look stale + un-injected.
      const targetId = weakIds[0]; // severity-5 'concept' row
      const { error: upErr } = await sb
        .from('user_weak_areas')
        .update({ detected_at: eightyHoursAgo, auto_injected_at: null, expired_at: null })
        .eq('id', targetId);
      if (upErr) return bad('mutate row to stale', upErr.message);
      ok('mutated existing row to detected_at=80h ago, auto_injected_at=null');
    } else if (stErr || !stale) {
      return bad('insert stale weak_area', stErr?.message ?? 'no row');
    } else {
      weakIds.push(stale.id);
      ok('insert stale weak_area (80h old)');
    }

    // 6. Call expire_stale_weak_areas
    const { data: expiredCount, error: expErr } = await sb.rpc('expire_stale_weak_areas');
    if (expErr) return bad('expire_stale_weak_areas', expErr.message);
    if (typeof expiredCount !== 'number' || expiredCount < 1) {
      return bad('expire returns >=1', `got ${expiredCount}`);
    }
    ok(`expire_stale_weak_areas returned ${expiredCount}`);

    const { data: expRow } = await sb
      .from('user_weak_areas')
      .select('id, expired_at')
      .eq('user_id', userId)
      .not('expired_at', 'is', null)
      .limit(1);
    if (!expRow || expRow.length === 0) return bad('row has expired_at set', 'none');
    ok('at least one row has expired_at populated');
  } finally {
    // 7. Cleanup
    if (userId) {
      await sb.from('user_weak_areas').delete().eq('user_id', userId);
    }
    if (topicId) {
      await sb.from('topics').delete().eq('id', topicId);
    }
    if (userId) {
      await sb.auth.admin.deleteUser(userId).catch(() => {});
    }
    ok('cleanup');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
