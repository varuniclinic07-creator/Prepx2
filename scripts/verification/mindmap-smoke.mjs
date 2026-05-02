// Animated Mindmaps SQL contract smoke (Sprint 3 / S3-3).
//
// Does NOT call the LLM. Exercises the migration 059 contract:
//   a. Pre-clean any leftover smoke rows by title='S3-3 SMOKE'.
//   b. Seed a topic.
//   c. Insert animated_mindmaps row (status='generating').
//   d. Insert root + 4 children + 8 grandchildren = 13 nodes with proper
//      parent_id chains (BFS by depth, capturing returned uuids).
//   e. Flip status='ready'; assert updated_at advanced past created_at.
//   f. Count nodes via the mindmap_id chain — expect 13.
//   g. CASCADE check: delete animated_mindmap, assert mindmap_nodes for that
//      mindmap are zero.
//   h. Cleanup the topic.
//
// Run: node --env-file=.env.local scripts/verification/mindmap-smoke.mjs

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

let pass = 0, fail = 0;
function ok(name) { pass++; console.log(`  PASS  ${name}`); }
function bad(name, err) { fail++; console.error(`  FAIL  ${name}: ${err}`); }

async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); }
}

let topicId = null;
let mindmapId = null;
let createdAt = null;
let rootUuid = null;
const childUuids = [];
const grandchildUuids = [];

async function main() {
  console.log('— Animated Mindmaps SQL contract smoke —');

  await step('pre-clean leftover smoke mindmaps', async () => {
    // CASCADE wipes mindmap_nodes when animated_mindmaps row is removed.
    await sb.from('animated_mindmaps').delete().eq('title', 'S3-3 SMOKE');
    await sb.from('topics').delete().eq('title', 'S3-3 SMOKE TOPIC');
  });

  await step('seed smoke topic', async () => {
    const { data, error } = await sb.from('topics').insert({
      title: 'S3-3 SMOKE TOPIC',
      subject: 'GS-I',
      content: { markdown: 'Smoke topic for mindmap.' },
    }).select('id').single();
    if (error) throw new Error(error.message);
    topicId = data.id;
    if (!topicId) throw new Error('no topic id returned');
  });

  await step('insert animated_mindmaps row (status=generating, layout=radial)', async () => {
    const { data, error } = await sb.from('animated_mindmaps').insert({
      topic_id: topicId,
      title: 'S3-3 SMOKE',
      layout: 'radial',
      status: 'generating',
      generated_by: 'smoke-test',
    }).select('id, status, layout, created_at, updated_at').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'generating') throw new Error(`status not generating: ${data.status}`);
    if (data.layout !== 'radial') throw new Error(`layout not radial: ${data.layout}`);
    mindmapId = data.id;
    createdAt = data.created_at;
  });

  await step('insert root node (depth=0, parent_id=null)', async () => {
    const { data, error } = await sb.from('mindmap_nodes').insert({
      mindmap_id: mindmapId,
      parent_id: null,
      label: 'Root',
      summary: 'Smoke root node.',
      depth: 0,
      position: [0, 0, 0],
      color_hint: 'primary',
    }).select('id, depth, parent_id').single();
    if (error) throw new Error(error.message);
    if (data.depth !== 0) throw new Error(`root depth not 0: ${data.depth}`);
    if (data.parent_id !== null) throw new Error(`root parent_id not null: ${data.parent_id}`);
    rootUuid = data.id;
  });

  await step('insert 4 depth-1 children referencing root uuid', async () => {
    const rows = Array.from({ length: 4 }, (_, i) => ({
      mindmap_id: mindmapId,
      parent_id: rootUuid,
      label: `Branch ${i + 1}`,
      summary: `Smoke branch ${i + 1}.`,
      depth: 1,
      position: [Math.cos(i) * 3, 0, Math.sin(i) * 3],
      color_hint: 'cyan',
    }));
    const { data, error } = await sb.from('mindmap_nodes').insert(rows).select('id, parent_id, depth');
    if (error) throw new Error(error.message);
    if (!data || data.length !== 4) throw new Error(`expected 4 children, got ${data?.length}`);
    for (const r of data) {
      if (r.parent_id !== rootUuid) throw new Error(`child parent_id mismatch: ${r.parent_id}`);
      if (r.depth !== 1) throw new Error(`child depth not 1: ${r.depth}`);
      childUuids.push(r.id);
    }
  });

  await step('insert 8 depth-2 grandchildren (2 per branch)', async () => {
    const rows = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        rows.push({
          mindmap_id: mindmapId,
          parent_id: childUuids[i],
          label: `Leaf ${i + 1}.${j + 1}`,
          summary: `Smoke leaf ${i + 1}.${j + 1}.`,
          depth: 2,
          position: [i + j * 0.3, j * 0.5, 0],
          color_hint: 'saffron',
        });
      }
    }
    const { data, error } = await sb.from('mindmap_nodes').insert(rows).select('id, parent_id, depth');
    if (error) throw new Error(error.message);
    if (!data || data.length !== 8) throw new Error(`expected 8 grandchildren, got ${data?.length}`);
    for (const r of data) {
      if (r.depth !== 2) throw new Error(`grandchild depth not 2: ${r.depth}`);
      if (!childUuids.includes(r.parent_id)) throw new Error(`grandchild parent_id not a known child: ${r.parent_id}`);
      grandchildUuids.push(r.id);
    }
  });

  await step('depth=6 boundary insert succeeds; depth=7 rejected by CHECK', async () => {
    // Allowed boundary
    const { data: okRow, error: okErr } = await sb.from('mindmap_nodes').insert({
      mindmap_id: mindmapId,
      parent_id: grandchildUuids[0],
      label: 'Deep allowed',
      depth: 6,
      position: [0, 0, 0],
    }).select('id').single();
    if (okErr) throw new Error(`depth=6 unexpectedly rejected: ${okErr.message}`);
    if (!okRow?.id) throw new Error('depth=6 insert returned no id');
    // Cleanup so the count assertion stays at 13.
    await sb.from('mindmap_nodes').delete().eq('id', okRow.id);

    // Out-of-range
    const { error: badErr } = await sb.from('mindmap_nodes').insert({
      mindmap_id: mindmapId,
      parent_id: grandchildUuids[0],
      label: 'Too deep',
      depth: 7,
      position: [0, 0, 0],
    });
    if (!badErr) throw new Error('depth=7 unexpectedly accepted');
    if (badErr.code !== '23514') throw new Error(`expected 23514, got ${badErr.code}: ${badErr.message}`);
  });

  await step('flip mindmap status=ready, updated_at advanced past created_at', async () => {
    // Force a tick so updated_at trigger advances visibly.
    await new Promise(r => setTimeout(r, 1100));
    const { data, error } = await sb.from('animated_mindmaps').update({
      status: 'ready',
    }).eq('id', mindmapId).select('status, created_at, updated_at').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'ready') throw new Error(`status not ready: ${data.status}`);
    if (!data.updated_at || !data.created_at) throw new Error('missing timestamps');
    if (new Date(data.updated_at).getTime() <= new Date(data.created_at).getTime()) {
      throw new Error('updated_at not advanced by trigger');
    }
    if (data.created_at !== createdAt) throw new Error('created_at unexpectedly mutated');
  });

  await step('node count via mindmap_id chain equals 13', async () => {
    const { count, error } = await sb.from('mindmap_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('mindmap_id', mindmapId);
    if (error) throw new Error(error.message);
    if (count !== 13) throw new Error(`expected 13 nodes, got ${count}`);
  });

  await step('CASCADE: delete mindmap removes all its nodes', async () => {
    const { error: delErr } = await sb.from('animated_mindmaps').delete().eq('id', mindmapId);
    if (delErr) throw new Error(`delete failed: ${delErr.message}`);
    const { count, error } = await sb.from('mindmap_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('mindmap_id', mindmapId);
    if (error) throw new Error(error.message);
    if (count !== 0) throw new Error(`expected 0 nodes after cascade, got ${count}`);
    mindmapId = null;
  });

  await step('cleanup smoke topic', async () => {
    if (mindmapId) await sb.from('animated_mindmaps').delete().eq('id', mindmapId);
    if (topicId) await sb.from('topics').delete().eq('id', topicId);
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
