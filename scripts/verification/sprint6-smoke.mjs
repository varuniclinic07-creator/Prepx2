// Sprint 6 combined smoke runner — calls all four feature smokes in sequence
// against cloud Supabase. Each individual smoke exits with its own pass/fail.
// This wrapper aggregates the results and exits non-zero if any leg fails.
//
// Pre-req: migrations 069, 070, 071, 072 must be applied to cloud Supabase
// before running. The MCP migration tool was unavailable in the implementing
// session — apply manually via Supabase Dashboard SQL editor or supabase CLI.
//
// Run: node --env-file=.env.local scripts/verification/sprint6-smoke.mjs

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SMOKES = [
  { name: 'S6-1 Video bake (069)',          file: 'bake-sweep-smoke.mjs' },
  { name: 'S6-2 3D notes (070)',            file: 'notes-3d-smoke.mjs' },
  { name: 'S6-3 Teacher coach (071)',       file: 'teacher-coach-smoke.mjs' },
  { name: 'S6-4 Render retry (072)',        file: 'render-retry-smoke.mjs' },
];

let totalPass = 0;
let totalFail = 0;
const results = [];

for (const smoke of SMOKES) {
  console.log(`\n═══ ${smoke.name} ═══`);
  const path = join(__dirname, smoke.file);
  const r = spawnSync(process.execPath, ['--env-file=.env.local', path], {
    stdio: 'inherit',
    cwd: join(__dirname, '..', '..'),
  });
  const passed = r.status === 0;
  results.push({ name: smoke.name, passed });
  if (passed) totalPass++;
  else totalFail++;
}

console.log('\n══════════════════════════════════════');
console.log(`Sprint 6 summary: ${totalPass}/${SMOKES.length} smokes PASS`);
for (const r of results) {
  console.log(`  ${r.passed ? '✓' : '✗'}  ${r.name}`);
}
process.exit(totalFail > 0 ? 1 : 0);
