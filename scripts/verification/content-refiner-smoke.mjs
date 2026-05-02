// Content Refiner SQL contract smoke (Sprint 2, Epic 3.2).
//
// Does NOT call the LLM. Exercises artifact_quality_audits contract:
//   a. Insert a fake video_scripts row to back a 'lecture_script' artifact.
//   b. Insert audit row with status='queued' for that artifact.
//   c. Update audit to status='rejected' with score 45, 2 high flags, remediations.
//   d. Insert a second audit for a fake high-quality smart_book_chapter (score 92, status='passed').
//   e. Update audit with admin_decision='approve' + admin_user_id + decided_at.
//   f. Verify UNIQUE (artifact_type, artifact_id, retrigger_count) — duplicate must 23505.
//   g. Cleanup all rows.
//
// Run: node --env-file=.env.local scripts/verification/content-refiner-smoke.mjs

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
let scriptId = null;
let chapterId = null;
let scriptAuditId = null;
let chapterAuditId = null;
let adminUserId = null;

async function main() {
  console.log('— Content Refiner SQL contract smoke —');

  // a. Seed a topic + a fake video_scripts row to back the lecture_script artifact.
  await step('seed topic + fake low-quality video_scripts row', async () => {
    const { data: topic, error: tErr } = await sb.from('topics').insert({
      title: `SMOKE refine topic ${Date.now()}`,
      subject: 'Polity',
      content: { sections: [] },
    }).select('id').single();
    if (tErr) throw new Error(`topic insert: ${tErr.message}`);
    topicId = topic.id;

    const { data: scr, error: sErr } = await sb.from('video_scripts').insert({
      topic_id: topicId,
      title: 'SMOKE low-quality script',
      script_text: 'Plain text body without citations. One short paragraph. No source markers.',
      script_markers: [],
      chapters: [],
      duration_target_seconds: 1800,
      status: 'draft',
      generated_by_agent: 'SMOKE',
      source_citations: [],
      flesch_kincaid_grade: 8.0,
      language: 'en',
    }).select('id').single();
    if (sErr) throw new Error(`video_scripts insert: ${sErr.message}`);
    scriptId = scr.id;

    // Pick any admin user for admin_user_id later (or any user).
    const { data: u } = await sb.from('users').select('id').limit(1).maybeSingle();
    if (u) adminUserId = u.id;
    else {
      // Fall back to creating a synthetic uuid; the FK is ON DELETE SET NULL so a
      // non-existent uuid would actually violate the FK on insert. Skip if no user.
      throw new Error('no users in DB to act as admin_user_id');
    }
  });

  // b. Insert a 'queued' audit row for the lecture_script.
  await step('insert audit (queued) for lecture_script', async () => {
    const { data, error } = await sb.from('artifact_quality_audits').insert({
      artifact_type: 'lecture_script',
      artifact_id: scriptId,
      status: 'queued',
      retrigger_count: 0,
    }).select('id, status').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'queued') throw new Error(`unexpected status ${data.status}`);
    scriptAuditId = data.id;
  });

  // c. Update audit to 'rejected' with score 45 + 2 high flags + remediations.
  await step("update audit → rejected (score 45, 2 high flags)", async () => {
    const flags = [
      { code: 'CITATIONS_LOW', severity: 'high', message: 'Only 0 citations (minimum 3).' },
      { code: 'FACTUAL', severity: 'high', message: 'Date of 42nd Amendment misstated.' },
    ];
    const remediations = [
      'Add at least 3 citations from canonical UPSC sources (NCERT, Laxmikanth, PIB).',
      'Cross-check the 42nd Amendment year (1976) against NCERT.',
    ];
    const { data, error } = await sb.from('artifact_quality_audits').update({
      status: 'rejected',
      quality_score: 45,
      readability_grade: 8.0,
      citation_count: 0,
      citation_urls: [],
      syllabus_alignment_score: 60,
      flags,
      remediations,
      raw_report: { llm: { coverage_summary: 'low quality smoke' } },
    }).eq('id', scriptAuditId).select('id, status, quality_score, flags').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'rejected') throw new Error(`status not rejected: ${data.status}`);
    if (Number(data.quality_score) !== 45) throw new Error(`score not 45: ${data.quality_score}`);
    if (!Array.isArray(data.flags) || data.flags.length !== 2) throw new Error(`flags length ${data.flags?.length}`);
  });

  // d. Insert a high-quality fake chapter audit (passed).
  await step('insert audit (passed, score 92) for smart_book_chapter', async () => {
    // Need a real chapter id since admin route flips chapters.status.
    // Insert a chapter row pointing at our smoke topic.
    const { data: ch, error: cErr } = await sb.from('chapters').insert({
      topic_id: topicId,
      chapter_num: 1,
      version: 1,
      title: 'SMOKE refine chapter',
      introduction: 'Smoke chapter intro for refine audit smoke.',
      detailed_content: 'Body content with [Source: NCERT] markers and structured exposition.',
      mnemonics: [{ text: 'A B C', type: 'acronym' }, { text: 'X Y Z', type: 'rhyme' }],
      mock_questions: [
        { question: 'Q1?', options: ['a','b','c','d'], correctIndex: 0, explanation: 'a' },
        { question: 'Q2?', options: ['a','b','c','d'], correctIndex: 1, explanation: 'b' },
        { question: 'Q3?', options: ['a','b','c','d'], correctIndex: 2, explanation: 'c' },
      ],
      mains_questions: [],
      pyqs: [],
      summary: 'Summary of the smoke chapter for the refine smoke. It contains at least fifty words to satisfy the validator and to give the verifier enough content to score readability and citation discipline. This summary fills the slot.',
      ca_links: [],
      flesch_kincaid_grade: 9.5,
      source_citations: [
        { source: 'NCERT', reference: 'Class XI Polity Ch 1' },
        { source: 'Laxmikanth', reference: 'Indian Polity Ch 1' },
        { source: 'PIB', reference: 'Press release' },
      ],
      status: 'generated_pending_approval',
    }).select('id').single();
    if (cErr) throw new Error(`chapters insert: ${cErr.message}`);
    chapterId = ch.id;

    const { data, error } = await sb.from('artifact_quality_audits').insert({
      artifact_type: 'smart_book_chapter',
      artifact_id: chapterId,
      status: 'passed',
      quality_score: 92,
      readability_grade: 9.5,
      citation_count: 3,
      citation_urls: [],
      syllabus_alignment_score: 88,
      flags: [],
      remediations: [],
      raw_report: { llm: { coverage_summary: 'high quality smoke' } },
      retrigger_count: 0,
    }).select('id, status, quality_score').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'passed') throw new Error(`status not passed: ${data.status}`);
    if (Number(data.quality_score) !== 92) throw new Error(`score not 92: ${data.quality_score}`);
    chapterAuditId = data.id;
  });

  // e. Update with admin_decision='approve'.
  await step('update audit with admin_decision=approve + admin_user_id + decided_at', async () => {
    const decidedAt = new Date().toISOString();
    const { data, error } = await sb.from('artifact_quality_audits').update({
      status: 'approved',
      admin_decision: 'approve',
      admin_user_id: adminUserId,
      admin_notes: 'looks good',
      decided_at: decidedAt,
    }).eq('id', chapterAuditId).select('id, admin_decision, admin_user_id, decided_at, status').single();
    if (error) throw new Error(error.message);
    if (data.admin_decision !== 'approve') throw new Error(`decision not approve: ${data.admin_decision}`);
    if (data.admin_user_id !== adminUserId) throw new Error(`admin_user_id mismatch`);
    if (!data.decided_at) throw new Error('decided_at not set');
    if (data.status !== 'approved') throw new Error(`status not approved: ${data.status}`);
  });

  // f. UNIQUE (artifact_type, artifact_id, retrigger_count) must reject duplicate.
  await step('UNIQUE (artifact_type, artifact_id, retrigger_count) rejects dup (23505)', async () => {
    const { error } = await sb.from('artifact_quality_audits').insert({
      artifact_type: 'lecture_script',
      artifact_id: scriptId,
      status: 'queued',
      retrigger_count: 0, // same triple as scriptAuditId
    });
    if (!error) throw new Error('expected unique-violation, got success');
    if (error.code !== '23505') throw new Error(`expected 23505, got ${error.code}: ${error.message}`);
  });

  // f.2 — bumping retrigger_count is allowed.
  await step('UNIQUE allows retrigger_count bump (retrigger #1)', async () => {
    const { error } = await sb.from('artifact_quality_audits').insert({
      artifact_type: 'lecture_script',
      artifact_id: scriptId,
      status: 'queued',
      retrigger_count: 1,
    });
    if (error) throw new Error(`unexpected: ${error.message}`);
  });

  // g. Cleanup.
  await step('cleanup audits + chapter + script + topic', async () => {
    await sb.from('artifact_quality_audits').delete().eq('artifact_id', scriptId);
    await sb.from('artifact_quality_audits').delete().eq('artifact_id', chapterId);
    if (chapterId)  await sb.from('chapters').delete().eq('id', chapterId);
    if (scriptId)   await sb.from('video_scripts').delete().eq('id', scriptId);
    if (topicId)    await sb.from('topics').delete().eq('id', topicId);
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
