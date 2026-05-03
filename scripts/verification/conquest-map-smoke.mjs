// Territory Conquest 3D Map SQL contract smoke (Sprint 4 / S4-4 — conquest slice).
//
// Does NOT call the LLM. Exercises migration 062's increment_capture + get_district_conquest_state RPCs:
//   a. Pre-clean leftover S4-4 SMOKE rows.
//   b. Seed two districts (with center_lat/lng) + one squad.
//   c. Insert one territory_ownership row (district A claimed by squad).
//   d. increment_capture bumps capture_count from 1 → 2 and refreshes captured_at.
//   e. increment_capture on a non-existent (district,squad) pair is a no-op (no error, no row created).
//   f. get_district_conquest_state returns BOTH districts (one owned, one unowned).
//   g. The owned district shows owner_squad_name + capture_count + center_lat/lng.
//   h. Cleanup.
//
// Run: node --env-file=.env.local scripts/verification/conquest-map-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(name) { pass++; console.log(`  PASS  ${name}`); }
function bad(name, err) { fail++; console.error(`  FAIL  ${name}: ${err}`); }
async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); }
}

const SMOKE_PREFIX = 'S4-4 SMOKE';
let districtAId = null;
let districtBId = null;
let squadId = null;
let creatorId = null;
let ownershipId = null;

async function main() {
  console.log('— Territory Conquest SQL contract smoke (S4-4) —');

  await step('pre-clean leftover S4-4 SMOKE rows', async () => {
    // Order matters because of FKs — wipe ownership first.
    const { data: olds } = await sb.from('districts').select('id').like('name', `${SMOKE_PREFIX}%`);
    if (olds && olds.length) {
      const ids = olds.map(d => d.id);
      await sb.from('territory_ownership').delete().in('district_id', ids);
      await sb.from('districts').delete().in('id', ids);
    }
    await sb.from('squads').delete().like('name', `${SMOKE_PREFIX}%`);
  });

  await step('seed creator user, two districts, one squad', async () => {
    // Creator user is needed for squad.created_by FK if it points at users.
    const email = `smoke-conquest-creator-${Date.now()}-${Math.random().toString(36).slice(2,8)}@example.com`;
    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email, password: 'SmokeP@ss123!', email_confirm: true,
    });
    if (cErr) throw new Error(`createUser: ${cErr.message}`);
    creatorId = created.user.id;
    await sb.from('users').upsert({ id: creatorId, email }, { onConflict: 'id' });

    const { data: a, error: aErr } = await sb.from('districts').insert({
      name: `${SMOKE_PREFIX} District A`, state: 'Karnataka',
      center_lat: 12.9716, center_lng: 77.5946,
    }).select('id').single();
    if (aErr) throw new Error(`district A: ${aErr.message}`);
    districtAId = a.id;

    const { data: b, error: bErr } = await sb.from('districts').insert({
      name: `${SMOKE_PREFIX} District B`, state: 'Maharashtra',
      center_lat: 19.0760, center_lng: 72.8777,
    }).select('id').single();
    if (bErr) throw new Error(`district B: ${bErr.message}`);
    districtBId = b.id;

    const { data: s, error: sErr } = await sb.from('squads').insert({
      name: `${SMOKE_PREFIX} Squad`, subject: 'polity',
      invite_code: `SMOKE-${Date.now().toString(36).toUpperCase()}`,
      created_by: creatorId,
    }).select('id').single();
    if (sErr) throw new Error(`squad: ${sErr.message}`);
    squadId = s.id;
  });

  await step('insert territory_ownership for district A', async () => {
    const { data, error } = await sb.from('territory_ownership').insert({
      district_id: districtAId, squad_id: squadId, capture_count: 1,
    }).select('id, capture_count').single();
    if (error) throw new Error(error.message);
    if (data.capture_count !== 1) throw new Error(`initial capture_count ${data.capture_count}`);
    ownershipId = data.id;
  });

  await step('increment_capture bumps capture_count and refreshes captured_at', async () => {
    const before = await sb.from('territory_ownership')
      .select('capture_count, captured_at').eq('id', ownershipId).single();
    await new Promise(r => setTimeout(r, 30));
    const { error } = await sb.rpc('increment_capture', { d_id: districtAId, s_id: squadId });
    if (error) throw new Error(error.message);
    const after = await sb.from('territory_ownership')
      .select('capture_count, captured_at').eq('id', ownershipId).single();
    if (after.data.capture_count !== before.data.capture_count + 1) {
      throw new Error(`capture_count ${before.data.capture_count} → ${after.data.capture_count} (expected +1)`);
    }
    if (new Date(after.data.captured_at) <= new Date(before.data.captured_at)) {
      throw new Error('captured_at did not advance');
    }
  });

  await step('increment_capture for non-existent pair is a no-op', async () => {
    const fakeDistrict = '00000000-0000-0000-0000-000000000000';
    const { error } = await sb.rpc('increment_capture', { d_id: fakeDistrict, s_id: squadId });
    if (error) throw new Error(`expected no-op got ${error.message}`);
    const { data } = await sb.from('territory_ownership').select('id').eq('district_id', fakeDistrict);
    if (data && data.length > 0) throw new Error('rpc auto-created a row for non-existent district');
  });

  await step('get_district_conquest_state returns owned + unowned district', async () => {
    const { data, error } = await sb.rpc('get_district_conquest_state');
    if (error) throw new Error(error.message);
    const a = data.find(r => r.district_id === districtAId);
    const b = data.find(r => r.district_id === districtBId);
    if (!a) throw new Error('district A missing from rpc result');
    if (!b) throw new Error('district B missing from rpc result');
    if (a.owner_squad_id !== squadId) throw new Error(`A owner_squad_id mismatch: ${a.owner_squad_id}`);
    if (a.owner_squad_name !== `${SMOKE_PREFIX} Squad`) throw new Error(`A owner_squad_name: ${a.owner_squad_name}`);
    if (a.capture_count < 2) throw new Error(`A capture_count=${a.capture_count} (expected ≥2)`);
    if (a.center_lat === null || a.center_lng === null) throw new Error('A coords missing');
    if (b.owner_squad_id !== null) throw new Error(`B should be unowned, got ${b.owner_squad_id}`);
    if (b.capture_count !== null) throw new Error(`B capture_count should be null, got ${b.capture_count}`);
  });

  await step('cleanup', async () => {
    await sb.from('territory_ownership').delete().eq('district_id', districtAId);
    await sb.from('districts').delete().in('id', [districtAId, districtBId].filter(Boolean));
    if (squadId) await sb.from('squads').delete().eq('id', squadId);
    if (creatorId) await sb.auth.admin.deleteUser(creatorId);
  });

  console.log(`\nResult: ${pass} pass, ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error('UNCAUGHT', e); process.exit(2); });
