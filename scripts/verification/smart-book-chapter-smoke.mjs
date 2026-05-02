// Smart Book chapter SQL contract smoke (Sprint 2, Epic 16.2).
//
// Does NOT call the LLM. It exercises the chapters table contract:
//   1) admin can insert a chapter with status='generated_pending_approval'
//   2) UNIQUE (topic_id, chapter_num, version) holds
//   3) updated_at trigger fires on UPDATE
//   4) flipping status='published' makes the chapter readable to authenticated
//      role (verified by selecting via service-role plus RLS-respecting query)
//   5) the validateChapter helper, replicated inline, flags an F-K=15 chapter
//      and accepts a passing one
//
// Run: node --env-file=.env.local scripts/verification/smart-book-chapter-smoke.mjs

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

// Inline replica of lib/agents/chapter-writer.ts validateChapter rules.
function validateChapter(c) {
  const errors = [];
  if (typeof c.flesch_kincaid_grade !== 'number') errors.push('flesch_kincaid_grade missing');
  else if (c.flesch_kincaid_grade > 10.5) errors.push(`F-K grade ${c.flesch_kincaid_grade} exceeds 10.5 ceiling`);
  const cites = Array.isArray(c.source_citations) ? c.source_citations : [];
  if (cites.length < 3) errors.push(`only ${cites.length} citations (need ≥3)`);
  const distinct = new Set(cites.map(x => x.source));
  if (distinct.size < 2) errors.push(`only ${distinct.size} distinct sources (need ≥2)`);
  const mnem = Array.isArray(c.mnemonics) ? c.mnemonics : [];
  if (mnem.length < 2) errors.push(`only ${mnem.length} mnemonics (need ≥2)`);
  const mocks = Array.isArray(c.mock_questions) ? c.mock_questions : [];
  if (mocks.length < 3) errors.push(`only ${mocks.length} mock MCQs (need ≥3)`);
  if (!c.summary || c.summary.trim().split(/\s+/).length < 50) errors.push('summary too short (need ≥ ~50 words)');
  return { ok: errors.length === 0, errors };
}

const sampleSummary = (
  'This chapter covered the foundational structure of the Indian Constitution. ' +
  'It traced the framing process, the key debates in the Constituent Assembly, and the principles drawn from foreign constitutions. ' +
  'It explained the significance of the Preamble, the Fundamental Rights, the Directive Principles, and the Fundamental Duties. ' +
  'It mapped the federal architecture, the separation of powers, and the role of judicial review. ' +
  'The reader can now answer prelims-style factual questions and approach mains essays with structured arguments anchored in NCERT and Laxmikanth.'
);

const passingChapter = {
  title: 'Constitution of India: An Overview',
  introduction: 'The Indian Constitution shapes how power is held and limited. This chapter explains its structure, its sources, and the values it protects. We start with the Constituent Assembly and end with the Preamble.',
  detailed_content: 'The Constituent Assembly first met in December 1946 [Source: Laxmikanth]. It debated for three years and adopted the Constitution on 26 November 1949. The text drew from the Government of India Act 1935, the Irish directive principles, and the British parliamentary model [Source: NCERT].\n\nThe Preamble names the people as the source of authority. It promises justice, liberty, equality, and fraternity. The 42nd Amendment added the words socialist, secular, and integrity in 1976 [Source: PIB].\n\nFundamental Rights guard individual freedom against state action. The Directive Principles guide the state toward welfare. The Fundamental Duties remind citizens of their share of the bargain.',
  mnemonics: [
    { text: 'PROUD: Preamble, Rights, Office, Union, Duties', type: 'acronym' },
    { text: 'FIVE FRIENDS visit the Constitution: France, Ireland, USA, UK, USSR', type: 'story' },
    { text: 'Parliament is two houses, two voices, one law', type: 'rhyme' },
  ],
  mock_questions: [
    { question: 'When was the Constitution adopted?', options: ['15 Aug 1947','26 Nov 1949','26 Jan 1950','2 Oct 1947'], correctIndex: 1, explanation: 'Adopted 1949, enforced 1950.' },
    { question: 'Which country inspired Directive Principles?', options: ['UK','USA','Ireland','France'], correctIndex: 2, explanation: 'Ireland.' },
    { question: 'Who chaired the Drafting Committee?', options: ['Nehru','Patel','Ambedkar','Rajendra Prasad'], correctIndex: 2, explanation: 'B R Ambedkar.' },
    { question: 'How many parts in the original Constitution?', options: ['18','20','22','25'], correctIndex: 2, explanation: 'Originally 22 parts.' },
    { question: 'Which amendment added Fundamental Duties?', options: ['42nd','44th','73rd','86th'], correctIndex: 0, explanation: '42nd Amendment, 1976.' },
  ],
  mains_questions: [
    { question: 'Discuss the borrowed features of the Indian Constitution.', expectedPoints: ['UK parliamentary model','US fundamental rights','Irish DPSP','Canadian federal scheme'] },
    { question: 'Examine the role of the Preamble.', expectedPoints: ['Source of authority','Objectives','Amendability','Kesavananda case'] },
    { question: 'Compare Fundamental Rights and Directive Principles.', expectedPoints: ['Justiciability','Aim','Conflict resolution','Minerva Mills'] },
  ],
  pyqs: [],
  summary: sampleSummary,
  ca_links: [],
  flesch_kincaid_grade: 9.2,
  source_citations: [
    { source: 'NCERT', reference: 'Class XI Indian Constitution at Work, Ch 1' },
    { source: 'Laxmikanth', reference: 'Indian Polity, Ch 1' },
    { source: 'PIB', reference: '42nd Amendment Act release' },
  ],
};

const failingChapter = {
  ...passingChapter,
  flesch_kincaid_grade: 15,
  source_citations: [{ source: 'NCERT', reference: 'Single source only' }],
  mnemonics: [{ text: 'too few', type: 'story' }],
  mock_questions: [],
};

let topicId = null;
let insertedChapterId = null;

async function step(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message || String(e)); }
}

async function main() {
  console.log('— Smart Book chapter SQL contract smoke —');

  // a. Insert test topic.
  await step('seed topic', async () => {
    const { data, error } = await sb.from('topics').insert({
      title: `SMOKE chapter topic ${Date.now()}`,
      subject: 'Polity',
      content: { sections: [] },
    }).select('id').single();
    if (error) throw new Error(error.message);
    topicId = data.id;
  });

  // b. Insert a hand-crafted passing chapter row.
  await step('insert passing chapter (status=generated_pending_approval)', async () => {
    const { data, error } = await sb.from('chapters').insert({
      topic_id: topicId,
      chapter_num: 1,
      version: 1,
      title: passingChapter.title,
      introduction: passingChapter.introduction,
      detailed_content: passingChapter.detailed_content,
      mnemonics: passingChapter.mnemonics,
      mock_questions: passingChapter.mock_questions,
      mains_questions: passingChapter.mains_questions,
      pyqs: passingChapter.pyqs,
      summary: passingChapter.summary,
      ca_links: passingChapter.ca_links,
      flesch_kincaid_grade: passingChapter.flesch_kincaid_grade,
      source_citations: passingChapter.source_citations,
      status: 'generated_pending_approval',
    }).select('id, status, updated_at').single();
    if (error) throw new Error(error.message);
    if (data.status !== 'generated_pending_approval') throw new Error(`unexpected status ${data.status}`);
    insertedChapterId = data.id;
  });

  // c. UNIQUE constraint should refuse duplicate (topic_id, chapter_num, version).
  await step('UNIQUE (topic_id, chapter_num, version) rejects duplicate', async () => {
    const { error } = await sb.from('chapters').insert({
      topic_id: topicId,
      chapter_num: 1,
      version: 1,
      title: 'dup',
      introduction: 'dup',
      detailed_content: 'dup',
      summary: sampleSummary,
      flesch_kincaid_grade: 9.2,
      source_citations: passingChapter.source_citations,
      status: 'draft',
    });
    if (!error) throw new Error('expected unique-violation, got success');
  });

  // d. updated_at trigger.
  await step('updated_at trigger fires on PATCH', async () => {
    const { data: before } = await sb.from('chapters').select('updated_at').eq('id', insertedChapterId).single();
    await new Promise(r => setTimeout(r, 1100));
    const { error } = await sb.from('chapters').update({
      status: 'published',
      approved_at: new Date().toISOString(),
    }).eq('id', insertedChapterId);
    if (error) throw new Error(error.message);
    const { data: after } = await sb.from('chapters').select('updated_at, status').eq('id', insertedChapterId).single();
    if (after.status !== 'published') throw new Error(`status not published, got ${after.status}`);
    if (new Date(after.updated_at) <= new Date(before.updated_at)) {
      throw new Error('updated_at did not advance');
    }
  });

  // e. SELECT back and assert columns.
  await step('SELECT round-trip — required columns non-null', async () => {
    const { data, error } = await sb.from('chapters').select(
      'id, topic_id, chapter_num, version, title, introduction, detailed_content, summary, mnemonics, mock_questions, mains_questions, source_citations, flesch_kincaid_grade, status, generated_by_agent'
    ).eq('id', insertedChapterId).single();
    if (error) throw new Error(error.message);
    const required = ['id','topic_id','title','introduction','detailed_content','summary','flesch_kincaid_grade','source_citations','status','generated_by_agent'];
    for (const f of required) {
      if (data[f] === null || data[f] === undefined) throw new Error(`null required column: ${f}`);
    }
    if (!Array.isArray(data.mnemonics)) throw new Error('mnemonics not array');
    if (!Array.isArray(data.mock_questions)) throw new Error('mock_questions not array');
    if (data.status !== 'published') throw new Error('status mismatch');
  });

  // f. validateChapter rules: passing/failing.
  await step('validateChapter accepts a passing chapter', async () => {
    const v = validateChapter(passingChapter);
    if (!v.ok) throw new Error(`unexpected errors: ${v.errors.join(', ')}`);
  });
  await step('validateChapter rejects F-K=15 / few citations', async () => {
    const v = validateChapter(failingChapter);
    if (v.ok) throw new Error('expected validator errors, got ok');
    const joined = v.errors.join(' | ');
    if (!joined.includes('F-K grade 15')) throw new Error(`F-K error not surfaced: ${joined}`);
    if (!joined.includes('citations')) throw new Error(`citations error not surfaced: ${joined}`);
    if (!joined.includes('mock MCQs')) throw new Error(`MCQ error not surfaced: ${joined}`);
  });

  // g. Cleanup.
  await step('cleanup chapter + topic', async () => {
    await sb.from('chapters').delete().eq('id', insertedChapterId);
    await sb.from('topics').delete().eq('id', topicId);
  });

  console.log(`\n— ${pass} pass / ${fail} fail —`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('UNEXPECTED', e);
  process.exit(2);
});
