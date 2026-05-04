// Sprint 7-A smoke — Hermes worker hardening (static config contract).
// Run: npx tsx scripts/verification/hermes-hardening-smoke.ts

import { ALL_QUEUE_NAMES, type QueueName } from '../../lib/queue/types';
import { QUEUE_WORKER_CONFIG } from '../../lib/queue/queues';

let pass = 0, fail = 0;
const ok = (n: string) => { pass++; console.log(`  PASS  ${n}`); };
const bad = (n: string, e: string) => { fail++; console.error(`  FAIL  ${n}: ${e}`); };

const HEAVY: QueueName[] = [
  'research-jobs', 'bundle-jobs', 'content-jobs', 'script-jobs', 'refine-jobs',
  'mnemonic-jobs', 'imagine-jobs', 'mindmap-jobs', 'shorts-jobs', 'interview-jobs',
  'render-jobs', 'ca-video-jobs',
];
const LIGHT: QueueName[] = ['coach-jobs', 'study-jobs'];

const missing = ALL_QUEUE_NAMES.filter(q => !(q in QUEUE_WORKER_CONFIG));
if (missing.length === 0) ok(`QUEUE_WORKER_CONFIG covers all ${ALL_QUEUE_NAMES.length} queues`);
else bad('coverage', `missing: ${missing.join(', ')}`);

let badConcurrency = 0;
for (const q of ALL_QUEUE_NAMES) {
  const c = QUEUE_WORKER_CONFIG[q]?.concurrency;
  if (!Number.isInteger(c) || c < 1) {
    badConcurrency++;
    bad(`${q} concurrency`, `expected int>=1, got ${c}`);
  }
}
if (badConcurrency === 0) ok('every queue has concurrency >= 1');

const unguarded: string[] = [];
for (const q of HEAVY) {
  const cfg = QUEUE_WORKER_CONFIG[q];
  if (!cfg?.limiter || !cfg.limiter.max || !cfg.limiter.duration) unguarded.push(q);
}
if (unguarded.length === 0) ok('all LLM/render-heavy queues have a rate limiter');
else bad('rate limit', `unguarded: ${unguarded.join(', ')}`);

const throttledLight: string[] = [];
for (const q of LIGHT) {
  if (QUEUE_WORKER_CONFIG[q]?.limiter) throttledLight.push(q);
}
if (throttledLight.length === 0) ok('coach/study queues are not rate-limited (latency-sensitive)');
else bad('latency', `unexpectedly throttled: ${throttledLight.join(', ')}`);

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
