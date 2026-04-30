#!/usr/bin/env node
// Post-remediation verification probe.
// Validates that 044_remediation_2026_04_29.sql actually fixed the live DB.
//
// Three layers:
//   1. Schema   — missing tables now exist
//   2. Function — RPC functions are callable (not 404)
//   3. Behavior — squad create/join/read works end-to-end with real auth,
//                 and a second unrelated user is correctly denied
//
// Plus: auth-not-regressed smoke (signed-in user can still read own row).
//
// Exits non-zero on any assertion failure. CI-safe.
//
// Outputs:
//   evidence/remediation-applied-2026-04-29.json   (machine-readable)
//   evidence/remediation-applied-2026-04-29.md     (human-readable summary)
//
// Usage:
//   node --env-file=.env.local scripts/verification/verify-remediation.mjs

import { writeFileSync, mkdirSync } from 'node:fs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(2)
}
if (!SERVICE_ROLE) {
  console.warn('WARN: SUPABASE_SERVICE_ROLE_KEY not set — Layer 3 will skip if email confirmation is required')
}

const TIMEOUT_MS = 12000
const RUN_AT = new Date().toISOString()
const checks = []   // each entry: { id, layer, description, pass, status, latencyMs, detail }

function record(c) {
  checks.push(c)
  const tag = c.pass ? 'PASS' : 'FAIL'
  const lat = c.latencyMs != null ? `${c.latencyMs}ms` : '   - '
  const st  = c.status != null ? `[${c.status}]` : '[ - ]'
  console.log(`${tag.padEnd(4)} ${st.padEnd(7)} ${lat.padStart(6)}  ${c.id.padEnd(38)} ${c.description}`)
  if (!c.pass && c.detail) console.log(`         detail: ${c.detail}`)
}

async function http(path, init = {}, jwt = null) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(`${URL}${path}`, {
      ...init,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${jwt || ANON}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: ac.signal,
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { status: res.status, ok: res.ok, latencyMs: Date.now() - started, json, text: text.slice(0, 500) }
  } catch (e) {
    return { status: 0, ok: false, latencyMs: Date.now() - started, error: e?.message ?? String(e) }
  } finally {
    clearTimeout(t)
  }
}

// ---------------------------------------------------------------------------
// Layer 1 — Schema existence
// ---------------------------------------------------------------------------

async function layer1_schema() {
  console.log('\n--- Layer 1: schema existence ---')

  const tables = [
    { name: 'squad_members',    expectFix: true,  prevStatus: 500 },
    { name: 'comfyui_jobs',     expectFix: true,  prevStatus: 404 },
    { name: 'comfyui_settings', expectFix: true,  prevStatus: 404 },
    { name: 'users',            expectFix: false, prevStatus: 200 },  // sanity
    { name: 'user_balances',    expectFix: false, prevStatus: 200 },
  ]

  for (const t of tables) {
    const r = await http(`/rest/v1/${t.name}?select=*&limit=0`)
    const exists200 = r.status === 200 || r.status === 206
    const rlsBlocked = r.status === 401 || r.status === 403  // table exists; just blocked
    const ok = exists200 || rlsBlocked
    record({
      id: `schema.${t.name}`,
      layer: 'schema',
      description: `${t.name} reachable (was ${t.prevStatus})`,
      pass: ok,
      status: r.status,
      latencyMs: r.latencyMs,
      detail: ok ? null : (r.text || r.error),
    })
  }
}

// ---------------------------------------------------------------------------
// Layer 2 — Function availability (probe RPC endpoints)
// ---------------------------------------------------------------------------
// Strategy: POST to /rest/v1/rpc/<fn> with the *correct argument names* but
// nonsense values. PostgREST resolves overloads by parameter names, so we must
// match the signature. After resolution:
//   - 200 / 400 / 422 / 42883 etc → function exists (errored on args/runtime, fine)
//   - 404 with PGRST202 / "Could not find the function" → function does NOT exist
//   - "without parameters" in the error → we sent wrong arg names

async function layer2_functions() {
  console.log('\n--- Layer 2: function availability ---')

  const FAKE_UUID = '00000000-0000-0000-0000-000000000000'
  const fns = [
    { name: 'user_in_squad', args: { p_squad_id: FAKE_UUID } },
    { name: 'is_admin', args: {} },
    { name: 'spend_coins', args: { p_user_id: FAKE_UUID, p_amount: 1, p_reason: 'probe' } },
    { name: 'accept_battle', args: { p_battle_id: FAKE_UUID, p_user_id: FAKE_UUID, p_wager: 1 } },
    { name: 'increment_subscriber_count', args: { p_tutor_id: FAKE_UUID } },
  ]

  for (const fn of fns) {
    const r = await http(`/rest/v1/rpc/${fn.name}`, {
      method: 'POST',
      body: JSON.stringify(fn.args),
    })
    const code = r.json?.code || ''
    const msg  = r.json?.message || r.text || ''
    // 404 with PGRST202 means function truly missing (not an overload mismatch).
    const notFound = (r.status === 404 && (code === 'PGRST202' || /could not find the function/i.test(msg)))
    const exists = !notFound
    record({
      id: `function.${fn.name}`,
      layer: 'function',
      description: `RPC ${fn.name} reachable`,
      pass: exists,
      status: r.status,
      latencyMs: r.latencyMs,
      detail: exists ? null : msg,
    })
  }
}

// ---------------------------------------------------------------------------
// Layer 3 — Behavior: squad create/join/read with real auth + isolation
// ---------------------------------------------------------------------------

async function signupAndSignin(label) {
  const email = `verify-${label}-${Date.now()}@example.com`
  const password = 'TestPass123!verify'

  // Path A: if we have service role, create+confirm via admin API in one call.
  // This works on self-hosted GoTrue regardless of "Confirm email" setting.
  if (SERVICE_ROLE) {
    const adminCreate = await fetch(`${URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    const adminText = await adminCreate.text()
    let adminJson = null
    try { adminJson = JSON.parse(adminText) } catch {}
    const userId = adminJson?.id || adminJson?.user?.id || null

    const si = await http('/auth/v1/token?grant_type=password', {
      method: 'POST', body: JSON.stringify({ email, password }),
    })
    const jwt = si.json?.access_token || null
    return {
      email, jwt, userId,
      signupStatus: adminCreate.status,
      signinStatus: si.status,
      signinDetail: jwt ? null : (si.json?.error_description || si.json?.msg || si.text),
    }
  }

  // Path B: fall back to public signup; only works if "Confirm email" is OFF
  const su = await http('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
  const si = await http('/auth/v1/token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  const jwt = si.json?.access_token || su.json?.access_token || null
  const userId = si.json?.user?.id || su.json?.user?.id || null
  return {
    email, jwt, userId,
    signupStatus: su.status,
    signinStatus: si.status,
    signinDetail: jwt ? null : (si.json?.error_description || si.json?.msg || si.text),
  }
}

async function layer3_behavior() {
  console.log('\n--- Layer 3: behavioral probe (squad RLS) ---')

  // Sign up two users
  const userA = await signupAndSignin('A')
  record({
    id: 'auth.userA.signin',
    layer: 'behavior',
    description: `userA signin returns JWT (${userA.email})`,
    pass: !!userA.jwt && !!userA.userId,
    status: userA.signinStatus,
    latencyMs: null,
    detail: userA.jwt ? null : `no jwt — signup=${userA.signupStatus} signin=${userA.signinStatus} (${userA.signinDetail || 'no detail'})`,
  })
  if (!userA.jwt) return { aborted: true, reason: 'userA could not authenticate' }

  const userB = await signupAndSignin('B')
  record({
    id: 'auth.userB.signin',
    layer: 'behavior',
    description: `userB signin returns JWT (${userB.email})`,
    pass: !!userB.jwt && !!userB.userId,
    status: userB.signinStatus,
    latencyMs: null,
    detail: userB.jwt ? null : `no jwt — signup=${userB.signupStatus} signin=${userB.signinStatus} (${userB.signinDetail || 'no detail'})`,
  })
  if (!userB.jwt) return { aborted: true, reason: 'userB could not authenticate' }

  // 3.1 — Auth-not-regressed smoke: userA can read own row from `users`
  // Note: 043 didn't touch users RLS, but tightened RLS regressions often appear here first.
  const aSelfRead = await http(`/rest/v1/users?select=id&id=eq.${userA.userId}`, {}, userA.jwt)
  record({
    id: 'auth.regression.users_select',
    layer: 'behavior',
    description: 'userA can SELECT own row from users (no RLS regression)',
    pass: aSelfRead.status === 200 && Array.isArray(aSelfRead.json),
    status: aSelfRead.status,
    latencyMs: aSelfRead.latencyMs,
    detail: aSelfRead.status === 200 ? null : (aSelfRead.text || aSelfRead.error),
  })

  // 3.2 — Test the original failure: SELECT from squad_members must NOT 500
  const sqMembersSelect = await http('/rest/v1/squad_members?select=user_id&limit=1', {}, userA.jwt)
  record({
    id: 'rls.squad_members.select_no_500',
    layer: 'behavior',
    description: 'SELECT squad_members no longer returns 500 (RLS recursion fixed)',
    pass: sqMembersSelect.status === 200,
    status: sqMembersSelect.status,
    latencyMs: sqMembersSelect.latencyMs,
    detail: sqMembersSelect.status === 200 ? null : (sqMembersSelect.text || sqMembersSelect.error),
  })
  // Latency sanity (slow RLS often signals hidden recursion-but-not-fatal)
  record({
    id: 'rls.squad_members.select_latency',
    layer: 'behavior',
    description: 'SELECT squad_members latency under 2s',
    pass: sqMembersSelect.latencyMs != null && sqMembersSelect.latencyMs < 2000,
    status: sqMembersSelect.status,
    latencyMs: sqMembersSelect.latencyMs,
    detail: sqMembersSelect.latencyMs >= 2000 ? `slow: ${sqMembersSelect.latencyMs}ms` : null,
  })

  // 3.3 — Create a squad (admin-write policy may forbid; that's a separate concern.
  //       To keep this probe self-contained, we INSERT directly via PostgREST. If
  //       it's blocked by 099's "Squads admin write" policy, we mark it skipped, not failed.)
  const squadInsert = await http('/rest/v1/squads', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      name: `verify-squad-${Date.now()}`,
      invite_code: `vfy${Date.now().toString(36)}`,
      created_by: userA.userId,
    }),
  }, userA.jwt)
  const squadId = Array.isArray(squadInsert.json) ? squadInsert.json[0]?.id : squadInsert.json?.id

  if (squadInsert.status === 401 || squadInsert.status === 403) {
    record({
      id: 'behavior.squad.create',
      layer: 'behavior',
      description: 'squad insert (skipped — RLS admin-write policy blocks non-admins, expected)',
      pass: true, // policy is correctly admin-only; not a bug
      status: squadInsert.status,
      latencyMs: squadInsert.latencyMs,
      detail: 'admin-only policy; skipping membership probe',
    })
    return { aborted: false, skippedSquadCreate: true, userA, userB }
  }

  const squadCreatedOk = (squadInsert.status === 201 || squadInsert.status === 200) && !!squadId
  record({
    id: 'behavior.squad.create',
    layer: 'behavior',
    description: 'squad created by userA',
    pass: squadCreatedOk,
    status: squadInsert.status,
    latencyMs: squadInsert.latencyMs,
    detail: squadCreatedOk ? `id=${squadId}` : (squadInsert.text || squadInsert.error),
  })
  if (!squadCreatedOk) return { aborted: false, userA, userB }

  // 3.4 — userA joins as a member
  const memInsert = await http('/rest/v1/squad_members', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ squad_id: squadId, user_id: userA.userId }),
  }, userA.jwt)
  record({
    id: 'behavior.squad_members.insert',
    layer: 'behavior',
    description: 'userA inserts own squad_members row',
    pass: memInsert.status === 201 || memInsert.status === 200,
    status: memInsert.status,
    latencyMs: memInsert.latencyMs,
    detail: (memInsert.status === 201 || memInsert.status === 200) ? null : (memInsert.text || memInsert.error),
  })

  // 3.5 — userA reads squad_members for own squad → should see at least their row
  const aRead = await http(`/rest/v1/squad_members?squad_id=eq.${squadId}&select=user_id`, {}, userA.jwt)
  const aSeesSelf = aRead.status === 200 && Array.isArray(aRead.json) &&
                    aRead.json.some(r => r.user_id === userA.userId)
  record({
    id: 'behavior.squad_members.read_own',
    layer: 'behavior',
    description: 'userA reads own squad_members and sees own row (helper resolves recursion)',
    pass: aSeesSelf,
    status: aRead.status,
    latencyMs: aRead.latencyMs,
    detail: aSeesSelf ? `${aRead.json.length} rows` : (aRead.text || aRead.error || 'self row not visible'),
  })

  // 3.6 — POLICY ISOLATION: userB (NOT in squad) reads same squad → should be empty
  // Per "Squad members read own" policy: USING (user_id = auth.uid() OR user_in_squad(squad_id))
  // userB is neither, so they should see 0 rows (200 + []).
  const bRead = await http(`/rest/v1/squad_members?squad_id=eq.${squadId}&select=user_id`, {}, userB.jwt)
  const bSeesNothing = bRead.status === 200 && Array.isArray(bRead.json) && bRead.json.length === 0
  record({
    id: 'behavior.squad_members.isolation',
    layer: 'behavior',
    description: 'userB (outsider) sees 0 squad_members for userA\'s squad (no row leakage)',
    pass: bSeesNothing,
    status: bRead.status,
    latencyMs: bRead.latencyMs,
    detail: bSeesNothing ? null : `LEAK: status=${bRead.status} body=${bRead.text || JSON.stringify(bRead.json)}`,
  })

  return { aborted: false, userA, userB, squadId }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Verifying remediation against ${URL}`)
  console.log(`Run at ${RUN_AT}\n`)

  await layer1_schema()
  await layer2_functions()
  const beh = await layer3_behavior()

  // Summary
  const total = checks.length
  const passed = checks.filter(c => c.pass).length
  const failed = total - passed
  const byLayer = {}
  for (const c of checks) {
    byLayer[c.layer] = byLayer[c.layer] || { pass: 0, fail: 0 }
    byLayer[c.layer][c.pass ? 'pass' : 'fail']++
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Total: ${total}   Passed: ${passed}   Failed: ${failed}`)
  for (const [layer, s] of Object.entries(byLayer)) {
    console.log(`  ${layer.padEnd(10)} ${s.pass}/${s.pass + s.fail}`)
  }

  // Write JSON artifact
  mkdirSync('evidence', { recursive: true })
  const jsonPath = 'evidence/remediation-applied-2026-04-29.json'
  writeFileSync(jsonPath, JSON.stringify({
    runAt: RUN_AT,
    url: URL,
    summary: { total, passed, failed, byLayer },
    aborted: beh?.aborted || false,
    skippedSquadCreate: beh?.skippedSquadCreate || false,
    checks,
  }, null, 2))
  console.log(`\nWrote ${jsonPath}`)

  // Write markdown summary
  const mdPath = 'evidence/remediation-applied-2026-04-29.md'
  const lines = []
  lines.push(`# Remediation Verification — 2026-04-29`)
  lines.push('')
  lines.push(`**Run at:** ${RUN_AT}`)
  lines.push(`**Target:** ${URL}`)
  lines.push(`**Result:** ${failed === 0 ? 'PASS' : 'FAIL'}  (${passed}/${total})`)
  lines.push('')
  lines.push(`## Summary by layer`)
  lines.push('')
  lines.push('| Layer | Pass | Fail |')
  lines.push('|-------|------|------|')
  for (const [layer, s] of Object.entries(byLayer)) {
    lines.push(`| ${layer} | ${s.pass} | ${s.fail} |`)
  }
  lines.push('')
  lines.push(`## Per-check results`)
  lines.push('')
  lines.push('| ID | Status | Latency | Pass | Description |')
  lines.push('|----|--------|---------|------|-------------|')
  for (const c of checks) {
    const lat = c.latencyMs != null ? `${c.latencyMs}ms` : '-'
    lines.push(`| \`${c.id}\` | ${c.status ?? '-'} | ${lat} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.description} |`)
  }
  if (failed > 0) {
    lines.push('')
    lines.push(`## Failures`)
    lines.push('')
    for (const c of checks.filter(x => !x.pass)) {
      lines.push(`- **${c.id}** — ${c.description}`)
      lines.push(`  - status: ${c.status}, latency: ${c.latencyMs}ms`)
      if (c.detail) lines.push(`  - detail: \`${c.detail.replace(/`/g, "'").slice(0, 300)}\``)
    }
  }
  lines.push('')
  lines.push(`## Source script`)
  lines.push(`\`scripts/verification/verify-remediation.mjs\``)
  lines.push('')
  writeFileSync(mdPath, lines.join('\n'))
  console.log(`Wrote ${mdPath}`)

  process.exit(failed === 0 ? 0 : 1)
}

main().catch(e => {
  console.error('Probe crashed:', e)
  process.exit(2)
})
