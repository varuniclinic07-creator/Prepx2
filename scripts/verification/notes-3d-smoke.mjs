// Sprint 6 S6-2 SQL contract smoke — user_topic_notes (070).
//
// Exercises the 3D notes table end-to-end against cloud Supabase using service-role:
//   1) seed user + topic
//   2) insert 3 notes (different colors + positions)
//   3) color CHECK rejects 'neon' (23514)
//   4) ordered SELECT returns 3 rows
//   5) PATCH content + position → updated_at advances
//   6) RLS isolation: stranger anon-shaped client cannot see notes
//   7) topic CASCADE: deleting the topic removes notes
//
// Run: node --env-file=.env.local scripts/verification/notes-3d-smoke.mjs

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
const email = `s6-notes-${stamp}@prepx-smoke.test`;
const strangerEmail = `s6-notes-${stamp}-x@prepx-smoke.test`;
let userId = null;
let strangerId = null;
let topicId = null;
const noteIds = [];

try {
  // 1. Seed primary user + stranger
  const { data: au, error: auErr } = await sb.auth.admin.createUser({
    email, password: 'NotesSmoke!23', email_confirm: true,
  });
  if (auErr || !au.user) throw new Error(`createUser: ${auErr?.message}`);
  userId = au.user.id;

  const { data: au2 } = await sb.auth.admin.createUser({
    email: strangerEmail, password: 'NotesSmoke!23', email_confirm: true,
  });
  strangerId = au2?.user?.id ?? null;
  ok('seed users');

  // Topic
  const { data: topic, error: tErr } = await sb.from('topics').insert({
    title: `Smoke topic ${stamp}`, subject: 'history', content: 'smoke',
  }).select('id').single();
  if (tErr || !topic) throw new Error(`topic: ${tErr?.message}`);
  topicId = topic.id;
  ok('seed topic');

  // 2. Insert 3 notes
  const fixtures = [
    { user_id: userId, topic_id: topicId, content: 'First note', color: 'primary', position_x: 0, position_y: 0, position_z: 0 },
    { user_id: userId, topic_id: topicId, content: 'Second cyan',  color: 'cyan',    position_x: 3, position_y: 1, position_z: 0 },
    { user_id: userId, topic_id: topicId, content: 'Third saffron', color: 'saffron', position_x: -2, position_y: -1.5, position_z: 0.5 },
  ];
  const { data: ins, error: insErr } = await sb.from('user_topic_notes').insert(fixtures).select('id, color, updated_at');
  if (insErr || !ins || ins.length !== 3) throw new Error(`insert 3: ${insErr?.message ?? 'wrong count'}`);
  for (const n of ins) noteIds.push(n.id);
  ok('insert 3 notes');

  // 3. Color CHECK
  const { error: ckErr } = await sb.from('user_topic_notes').insert({
    user_id: userId, topic_id: topicId, content: 'bad', color: 'neon',
  });
  if (ckErr?.code === '23514') ok('color CHECK rejects neon (23514)');
  else bad('color CHECK', `expected 23514, got ${ckErr?.code}`);

  // 4. Ordered select
  const { data: rows } = await sb.from('user_topic_notes')
    .select('id, content, color, position_x').eq('topic_id', topicId).order('created_at', { ascending: true });
  if (rows && rows.length === 3) ok('ordered SELECT returns 3 rows');
  else bad('select 3', `got ${rows?.length}`);

  // 5. PATCH content + position → updated_at advances
  const before = ins[0].updated_at;
  await new Promise((r) => setTimeout(r, 1100)); // ensure timestamp differs
  const { data: patched, error: pErr } = await sb.from('user_topic_notes')
    .update({ content: 'patched body', position_x: 5.5 })
    .eq('id', noteIds[0])
    .select('updated_at, content, position_x').single();
  if (pErr) throw new Error(`patch: ${pErr.message}`);
  if (patched && patched.content === 'patched body' && Number(patched.position_x) === 5.5
      && new Date(patched.updated_at) > new Date(before)) {
    ok('PATCH advances updated_at + persists fields');
  } else {
    bad('PATCH', `before=${before} after=${patched?.updated_at} content=${patched?.content}`);
  }

  // 6. RLS — anon client cannot read this user's notes
  if (anonKey) {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: anonRows } = await anon.from('user_topic_notes')
      .select('id').eq('topic_id', topicId);
    if (!anonRows || anonRows.length === 0) ok('RLS — anon SELECT returns 0 rows');
    else bad('RLS', `anon got ${anonRows.length} rows`);
  } else {
    ok('RLS — skipped (no anon key)');
  }

  // 7. Topic CASCADE → notes removed
  await sb.from('topics').delete().eq('id', topicId);
  topicId = null;
  const { data: after } = await sb.from('user_topic_notes').select('id').in('id', noteIds);
  if (!after || after.length === 0) {
    ok('topic CASCADE removes notes');
    noteIds.length = 0;
  } else {
    bad('CASCADE', `${after.length} notes survived topic delete`);
  }
} catch (err) {
  bad('smoke', err.message || String(err));
} finally {
  // Cleanup
  if (noteIds.length) await sb.from('user_topic_notes').delete().in('id', noteIds);
  if (topicId) await sb.from('topics').delete().eq('id', topicId);
  if (userId) await sb.auth.admin.deleteUser(userId).catch(() => {});
  if (strangerId) await sb.auth.admin.deleteUser(strangerId).catch(() => {});
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exit(fail > 0 ? 1 : 0);
}
