// Sprint 9-E Phase B — offline deterministic smoke for the struggle classifier.
//
// Pure: no network, no DB. Validates classifyStruggle() over the rule matrix:
//   1. zero events                                          → fresh
//   2. quiz_pass >= 1 && quiz_fail == 0 && replay <= 1      → mastered
//   3. replay > 2 || query > 2 || quiz_fail >= 1            → struggling
//   4. otherwise                                            → engaged
//
// Mastery score boundary checks confirm the deterministic 0..1 clamp.
//
// Run:
//   npx tsx scripts/verification/sprint9e-memory-offline-smoke.ts

import { classifyStruggle } from '../../lib/learning/memory';

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✔ ${name}`); }
  else      { failed++; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('=== Sprint 9-E — memory engine offline smoke ===\n');

// ─── Status matrix ────────────────────────────────────────────────────
console.log('--- status classification ---');

const fresh = classifyStruggle({ replay_count: 0, query_count: 0, quiz_fail_count: 0, quiz_pass_count: 0 });
check('zero events → fresh',           fresh.status === 'fresh');
check('zero events → score 0.5',       fresh.mastery_score === 0.5);

const engaged1 = classifyStruggle({ replay_count: 1, query_count: 1, quiz_fail_count: 0, quiz_pass_count: 0 });
check('mild engagement → engaged',     engaged1.status === 'engaged', `got ${engaged1.status}`);

const mastered = classifyStruggle({ replay_count: 0, query_count: 1, quiz_fail_count: 0, quiz_pass_count: 1 });
check('1 quiz pass + 1 query → mastered', mastered.status === 'mastered', `got ${mastered.status}`);
check('mastered score = 0.75',         mastered.mastery_score === 0.75, `got ${mastered.mastery_score}`);

const masteredReplay1 = classifyStruggle({ replay_count: 1, query_count: 0, quiz_fail_count: 0, quiz_pass_count: 1 });
check('quiz pass + 1 replay → still mastered', masteredReplay1.status === 'mastered');

const notMasteredHighReplay = classifyStruggle({ replay_count: 2, query_count: 0, quiz_fail_count: 0, quiz_pass_count: 1 });
check('quiz pass + 2 replays → engaged (replay <= 1 rule)', notMasteredHighReplay.status === 'engaged', `got ${notMasteredHighReplay.status}`);

// Struggling triggers
const struggleReplay = classifyStruggle({ replay_count: 3, query_count: 0, quiz_fail_count: 0, quiz_pass_count: 0 });
check('replay_count = 3 → struggling',  struggleReplay.status === 'struggling');
check('replay 3 score = 0.40',          struggleReplay.mastery_score === 0.40, `got ${struggleReplay.mastery_score}`);

const struggleQuery = classifyStruggle({ replay_count: 0, query_count: 3, quiz_fail_count: 0, quiz_pass_count: 0 });
check('query_count = 3 → struggling',   struggleQuery.status === 'struggling');

const struggleFail  = classifyStruggle({ replay_count: 0, query_count: 0, quiz_fail_count: 1, quiz_pass_count: 0 });
check('quiz_fail = 1 → struggling',     struggleFail.status === 'struggling');
check('quiz fail score = 0.25',         struggleFail.mastery_score === 0.25, `got ${struggleFail.mastery_score}`);

// Compound — exactly the user-given example
const compound = classifyStruggle({ replay_count: 3, query_count: 3, quiz_fail_count: 1, quiz_pass_count: 0 });
check('replay 3 + query 3 + 1 fail → struggling (the canonical example)',
  compound.status === 'struggling');
check('compound score clamps to >= 0',  compound.mastery_score >= 0);

// Mixed pass + fail
const mixed = classifyStruggle({ replay_count: 1, query_count: 1, quiz_fail_count: 1, quiz_pass_count: 1 });
check('1 pass + 1 fail → struggling (any fail is a struggle signal)',
  mixed.status === 'struggling');
check('balanced pass/fail score = 0.5',  mixed.mastery_score === 0.5, `got ${mixed.mastery_score}`);

// Score clamp boundary
const allPass = classifyStruggle({ replay_count: 0, query_count: 0, quiz_fail_count: 0, quiz_pass_count: 5 });
check('many passes, no fails → mastered', allPass.status === 'mastered');
check('many passes score ≤ 1.0',          allPass.mastery_score <= 1.0);
check('many passes score = 0.75',         allPass.mastery_score === 0.75, `got ${allPass.mastery_score}`);

const allFail = classifyStruggle({ replay_count: 5, query_count: 5, quiz_fail_count: 5, quiz_pass_count: 0 });
check('many fails, many replays/queries → struggling', allFail.status === 'struggling');
check('worst-case score >= 0',                          allFail.mastery_score >= 0);
// 0.5 - 0.25 (fail>pass) - 0.10 (replay>2) - 0.10 (query>2) = 0.05
check('worst-case score = 0.05',                        allFail.mastery_score === 0.05, `got ${allFail.mastery_score}`);

// ─── Determinism guarantee ────────────────────────────────────────────
console.log('\n--- determinism ---');
const a = classifyStruggle({ replay_count: 3, query_count: 1, quiz_fail_count: 1, quiz_pass_count: 0 });
const b = classifyStruggle({ replay_count: 3, query_count: 1, quiz_fail_count: 1, quiz_pass_count: 0 });
check('classifyStruggle is pure (same inputs → same outputs)',
  a.status === b.status && a.mastery_score === b.mastery_score);

// ─── Final tally ─────────────────────────────────────────────────────
console.log('\n=== Sprint 9-E OFFLINE SMOKE ' + (failed === 0 ? 'PASSED' : 'FAILED') + ' ===');
console.log(`  passed: ${passed}`);
console.log(`  failed: ${failed}`);
if (failed > 0) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
process.exit(0);
