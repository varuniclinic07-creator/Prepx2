// Sprint 9-D Phase A/B/C — offline query engine smoke.
//
// Pure deterministic test: builds a ConceptIndex from a synthetic
// (timeline, notes, quiz, metadata) tuple, runs answerQuery() with phrase=false,
// asserts the directive's contract:
//   { matchedConcept, confidence, timestamps, replaySegments,
//     formulas, relatedNotes, relatedQuiz / relatedQuizMcqIds,
//     learningObjectives, sourceScenes / scenePositions }
//
// Run:
//   npx tsx scripts/verification/sprint9d-query-engine-offline-smoke.ts
//
// CI rule (per directive): smokes default to phrase=false → no token variance,
// no model drift, no API key required. Exit 0 on full pass, 1 otherwise.

import { buildConceptIndex } from '../../lib/learning/concept-index';
import { answerQuery } from '../../lib/learning/query-engine';
import { classify } from '../../lib/learning/intent';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('=== Sprint 9-D — query engine offline smoke ===\n');

// ─── Fixture: synthetic Ohm's Law lecture ────────────────────────────
const timeline = {
  topic: 'ohms-law',
  title: "Ohm's Law",
  duration: 33.9,
  scenes: [
    { position: 0, start: 0,    end: 3,    type: 'intro',     description: 'Title card' },
    { position: 1, start: 3,    end: 12.3, type: 'classroom', description: 'Teacher at the board' },
    { position: 2, start: 12.3, end: 18.7, type: 'board',     description: 'V = IR derivation' },
    { position: 3, start: 18.7, end: 25,   type: 'board',     description: 'Resistance worked example' },
    { position: 4, start: 25,   end: 33.9, type: 'outro',     description: 'Recap' },
  ],
  noteMarkers: [
    { id: 1, timestamp: 13.0, text: 'Resistance is the opposition to electric current.' },
    { id: 2, timestamp: 19.0, text: 'V = I × R relates voltage, current, and resistance.' },
  ],
  quizMarkers: [
    { id: 1, timestamp: 28, concept: 'Resistance', question: 'What unit measures resistance?' },
    { id: 2, timestamp: 30, concept: 'Voltage',    question: 'What unit measures voltage?' },
  ],
};

const notes = {
  title: "Ohm's Law — Notes",
  summary: 'Voltage equals current times resistance.',
  key_points: [
    'Resistance is the opposition to electric current.',
    'Voltage drives current through a conductor.',
    'V = I × R is the fundamental relation.',
    'Resistance is measured in ohms.',
  ],
  formula_sheet: [
    { name: "Ohm's Law", expression: 'V = IR', where: { V: 'voltage', I: 'current', R: 'resistance' } },
  ],
};

const quiz = {
  topic: "Ohm's Law",
  mcq: [
    { id: 1, question: 'What unit measures resistance?', concept: 'Resistance' },
    { id: 2, question: 'What unit measures voltage?',    concept: 'Voltage' },
    { id: 3, question: 'V = ?',                          concept: 'Resistance' },
  ],
};

const metadata = {
  topic: { slug: 'ohms-law', title: "Ohm's Law", formula: 'V = IR' },
  concept: {
    detected_topic: "Ohm's Law",
    detected_concepts: [
      { name: 'Resistance', definition: 'Opposition to electric current.', difficulty: 'beginner' as const },
      { name: 'Voltage',    definition: 'Electrical potential difference.', difficulty: 'beginner' as const },
    ],
    formulas: ['V = IR'],
    learning_objectives: [
      'Define resistance and state its unit.',
      'Apply V = IR to compute current.',
    ],
  },
};

// ─── Build the index ─────────────────────────────────────────────────
const index = buildConceptIndex({ timeline, notes, quiz, metadata });

console.log('--- ConceptIndex built ---');
console.log(`  version=${index.version} concepts=${index.concepts.length} duration=${index.duration}s`);
check('ConceptIndex.version is 9d-1', index.version === '9d-1');
check('ConceptIndex.duration matches timeline', index.duration === 33.9);
check('ConceptIndex has at least 2 concepts', index.concepts.length >= 2);
const resistance = index.concepts.find((c) => c.name === 'Resistance');
const voltage    = index.concepts.find((c) => c.name === 'Voltage');
check('Resistance concept exists', !!resistance);
check('Voltage concept exists', !!voltage);
console.log();

// ─── Intent classifier sanity ────────────────────────────────────────
console.log('--- Intent classifier ---');
const intents: Array<[string, string]> = [
  ['What is resistance?',           'what-is'],
  ['Show me the formula',           'show-formula'],
  ['Explain again',                 'explain-again'],
  ['Jump to voltage',               'jump-to-topic'],
  ['Give me a recap',               'give-recap'],
];
for (const [q, expected] of intents) {
  const cls = classify(q);
  check(`"${q}" → intent=${expected}`, cls.intent === expected, `got ${cls.intent}`);
}
console.log();

async function main() {
// ─── what-is on a known concept ──────────────────────────────────────
console.log('--- answerQuery: "What is resistance?" (phrase=false) ---');
const r1 = await answerQuery({ index, q: 'What is resistance?' });
check('intent classified what-is',                  r1.intent === 'what-is');
check('matchedConcept is Resistance',               r1.matchedConcept?.name === 'Resistance');
check('confidence ≥ 0.95 (exact name match)',       r1.confidence >= 0.95, `got ${r1.confidence}`);
check('timestamps non-empty',                       r1.timestamps.length > 0);
check('replaySegments non-empty',                   r1.replaySegments.length > 0);
check('answer is null when phrase=false',           r1.answer === null);
check('relatedQuizMcqIds (engine-native field) array', Array.isArray(r1.relatedQuizMcqIds));
check('scenePositions (engine-native field) array',     Array.isArray(r1.scenePositions));
check('learningObjectives field present (array)',   Array.isArray(r1.learningObjectives));
console.log();

// ─── show-formula ────────────────────────────────────────────────────
console.log('--- answerQuery: "Show me the formula" (phrase=false) ---');
const r2 = await answerQuery({ index, q: 'Show me the formula' });
check('intent classified show-formula',             r2.intent === 'show-formula');
check('formulas non-empty (V = IR)',                r2.formulas.length > 0, `got ${JSON.stringify(r2.formulas)}`);
check('formulas include V = IR',                    r2.formulas.some((f) => /V\s*=\s*IR/i.test(f)));
console.log();

// ─── give-recap (whole-lecture path) ─────────────────────────────────
console.log('--- answerQuery: "Give me a recap" (phrase=false) ---');
const r3 = await answerQuery({ index, q: 'Give me a recap' });
check('intent classified give-recap',               r3.intent === 'give-recap');
check('matchedConcept is null (lecture-level)',     r3.matchedConcept === null);
check('confidence ≈ 0.85 for recap',                Math.abs(r3.confidence - 0.85) < 0.001);
check('timestamps cover full duration',             r3.timestamps[0]?.start === 0 && r3.timestamps[0]?.end === index.duration);
console.log();

// ─── unknown concept → fallback ──────────────────────────────────────
console.log('--- answerQuery: "What is photosynthesis?" (phrase=false) ---');
const r4 = await answerQuery({ index, q: 'What is photosynthesis?' });
check('matchedConcept is null on unknown topic',    r4.matchedConcept === null);
check('confidence ≤ 0.1 on miss',                   r4.confidence <= 0.1, `got ${r4.confidence}`);
console.log();

// ─── DI: phrase=true with stubbed chat ───────────────────────────────
console.log('--- answerQuery: phrase=true with stubbed chat (no aiChat) ---');
const r5 = await answerQuery({
  index,
  q: 'What is resistance?',
  phrase: true,
  chat: async ({ system, user }) => {
    if (!system.includes('UPSC') && !system.includes('tutor')) throw new Error('unexpected system');
    if (!user.includes('Resistance')) throw new Error('user prompt missing concept');
    return 'Resistance is the opposition a material offers to the flow of electric current.';
  },
});
check('answer populated when phrase=true',          typeof r5.answer === 'string' && r5.answer.length > 10);
check('matchedConcept still Resistance (deterministic core unchanged)', r5.matchedConcept?.name === 'Resistance');
check('confidence still ≥ 0.95 (LLM did not touch retrieval)', r5.confidence >= 0.95);
console.log();

// ─── Final tally ─────────────────────────────────────────────────────
console.log('=== Sprint 9-D OFFLINE SMOKE ' + (failed === 0 ? 'PASSED' : 'FAILED') + ' ===');
console.log(`  passed: ${passed}`);
console.log(`  failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
