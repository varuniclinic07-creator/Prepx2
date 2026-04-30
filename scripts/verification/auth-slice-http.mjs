#!/usr/bin/env node
// Auth thin slice — HTTP layer (5 of 7 behaviors).
//
// Probes Supabase GoTrue + PostgREST directly. Captures the JWT, cookie
// shape, and PostgREST response so the Playwright layer can compare against
// what the browser produces (the FINDING-A1 collision is observable as
// "two different cookie shapes for the same user session").
//
// Behaviors covered here (HTTP-only, no browser needed):
//   #1   Signup → email confirm (admin API) → password signin → JWT + users row
//   #2   userA reads own users row via PostgREST  (RLS allow)
//   #3   userA cannot see userB's row             (RLS deny / empty)
//   #6a  Stale access token + valid refresh → /token?grant_type=refresh_token
//        returns new JWT (refresh authority works)
//   #6b  Invalid access + invalid refresh → 400/401 on /user (no infinite refresh)
//
// Behaviors deferred to Playwright:
//   #4  SSR reload survives login — needs the browser writing the SSR cookie chain
//   #5  Multi-tab logout invalidation — needs two browser contexts
//
// Outputs:
//   evidence/auth-slice-http-2026-04-30.json
//   evidence/auth-slice-http-2026-04-30.md

import { writeFileSync, mkdirSync } from 'node:fs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(2)
}
if (!SERVICE_ROLE) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY (needed to admin-confirm test users)')
  process.exit(2)
}

const TIMEOUT_MS = 12000
const RUN_AT = new Date().toISOString()
const checks = []

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
    return { status: res.status, ok: res.ok, latencyMs: Date.now() - started, json, text: text.slice(0, 500), headers: Object.fromEntries(res.headers.entries()) }
  } catch (e) {
    return { status: 0, ok: false, latencyMs: Date.now() - started, error: e?.message ?? String(e) }
  } finally {
    clearTimeout(t)
  }
}

async function adminCreateConfirmed(email, password) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text: text.slice(0, 300) }
}

async function adminDeleteUser(userId) {
  if (!userId) return
  await fetch(`${URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
  }).catch(() => {})
}

async function signin(email, password) {
  const r = await http('/auth/v1/token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  return {
    status: r.status,
    accessToken: r.json?.access_token || null,
    refreshToken: r.json?.refresh_token || null,
    userId: r.json?.user?.id || null,
    expiresIn: r.json?.expires_in || null,
    detail: r.json?.error_description || r.json?.msg || null,
  }
}

async function refreshSession(refreshToken) {
  return http('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

async function main() {
  console.log(`Auth slice (HTTP) — ${URL}`)
  console.log(`Run at ${RUN_AT}\n`)

  const tsA = Date.now()
  const tsB = tsA + 1
  const userA = { email: `slice-A-${tsA}@example.com`, password: 'TestPass123!slice' }
  const userB = { email: `slice-B-${tsB}@example.com`, password: 'TestPass123!slice' }

  // ---------------- Behavior 1: signup → confirm → signin ----------------
  console.log('--- B1: signup + confirm + signin ---')
  const createA = await adminCreateConfirmed(userA.email, userA.password)
  userA.userId = createA.json?.id || createA.json?.user?.id
  record({
    id: 'b1.userA.admin_create',
    description: 'admin API creates and confirms userA',
    pass: createA.status === 200 && !!userA.userId,
    status: createA.status,
    detail: createA.status === 200 ? null : createA.text,
  })

  const createB = await adminCreateConfirmed(userB.email, userB.password)
  userB.userId = createB.json?.id || createB.json?.user?.id
  record({
    id: 'b1.userB.admin_create',
    description: 'admin API creates and confirms userB',
    pass: createB.status === 200 && !!userB.userId,
    status: createB.status,
    detail: createB.status === 200 ? null : createB.text,
  })

  if (!userA.userId || !userB.userId) {
    console.log('Cannot proceed without both users')
    return finish()
  }

  const siA = await signin(userA.email, userA.password)
  userA.jwt = siA.accessToken
  userA.refresh = siA.refreshToken
  record({
    id: 'b1.userA.signin',
    description: 'userA password signin returns JWT + refresh',
    pass: !!userA.jwt && !!userA.refresh,
    status: siA.status,
    detail: userA.jwt ? null : siA.detail,
  })

  const siB = await signin(userB.email, userB.password)
  userB.jwt = siB.accessToken
  userB.refresh = siB.refreshToken
  record({
    id: 'b1.userB.signin',
    description: 'userB password signin returns JWT + refresh',
    pass: !!userB.jwt && !!userB.refresh,
    status: siB.status,
    detail: userB.jwt ? null : siB.detail,
  })

  if (!userA.jwt || !userB.jwt) return finish({ userA, userB })

  // Verify the public.users row was auto-created by the trigger (or accept its absence — the slice
  // captures behavior, not whether trigger fires).
  const aRow = await http(`/rest/v1/users?select=id&id=eq.${userA.userId}`, {}, userA.jwt)
  const aRowExists = aRow.status === 200 && Array.isArray(aRow.json) && aRow.json.length === 1
  record({
    id: 'b1.userA.users_row_present',
    description: 'public.users row exists for userA after signup (handle_new_user trigger)',
    pass: aRowExists,
    status: aRow.status,
    latencyMs: aRow.latencyMs,
    detail: aRowExists ? null : `expected 1 row, got ${Array.isArray(aRow.json) ? aRow.json.length : '?'}; body=${aRow.text}`,
  })

  // ---------------- Behavior 2: authenticated SELECT (own row) ----------------
  console.log('\n--- B2: userA reads own users row ---')
  const ownRead = await http(`/rest/v1/users?select=id,email,role&id=eq.${userA.userId}`, {}, userA.jwt)
  const ownReadOk = ownRead.status === 200 && Array.isArray(ownRead.json) && ownRead.json.length === 1 && ownRead.json[0].id === userA.userId
  record({
    id: 'b2.userA.read_own',
    description: 'userA SELECTs own users row (RLS allow)',
    pass: ownReadOk,
    status: ownRead.status,
    latencyMs: ownRead.latencyMs,
    detail: ownReadOk ? null : `body=${ownRead.text}`,
  })

  // ---------------- Behavior 3: cross-user isolation ----------------
  console.log('\n--- B3: userA cannot read userB row ---')
  const crossRead = await http(`/rest/v1/users?select=id&id=eq.${userB.userId}`, {}, userA.jwt)
  const crossDenied = crossRead.status === 200 && Array.isArray(crossRead.json) && crossRead.json.length === 0
  record({
    id: 'b3.userA.read_userB_denied',
    description: 'userA SELECT of userB row returns empty (RLS deny)',
    pass: crossDenied,
    status: crossRead.status,
    latencyMs: crossRead.latencyMs,
    detail: crossDenied ? null : `LEAK or ERROR: status=${crossRead.status} body=${crossRead.text}`,
  })

  // ---------------- Behavior 6a: refresh works ----------------
  console.log('\n--- B6a: refresh token grants new JWT ---')
  const refreshed = await refreshSession(userA.refresh)
  const newAccess = refreshed.json?.access_token
  const refreshOk = refreshed.status === 200 && !!newAccess && newAccess !== userA.jwt
  record({
    id: 'b6a.refresh_grants_new_jwt',
    description: 'POST /token?grant_type=refresh_token returns a NEW access token',
    pass: refreshOk,
    status: refreshed.status,
    latencyMs: refreshed.latencyMs,
    detail: refreshOk ? null : (refreshed.text || 'no new token'),
  })

  // Verify the new JWT actually authenticates a request
  if (newAccess) {
    const newJwtCheck = await http(`/rest/v1/users?select=id&id=eq.${userA.userId}`, {}, newAccess)
    record({
      id: 'b6a.new_jwt_authenticates',
      description: 'new access token authenticates a PostgREST request',
      pass: newJwtCheck.status === 200 && Array.isArray(newJwtCheck.json) && newJwtCheck.json.length === 1,
      status: newJwtCheck.status,
      latencyMs: newJwtCheck.latencyMs,
      detail: newJwtCheck.status === 200 ? null : newJwtCheck.text,
    })
  }

  // ---------------- Behavior 6b: invalid refresh denied ----------------
  console.log('\n--- B6b: invalid refresh token denied ---')
  const badRefresh = await http('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: 'definitely-not-a-valid-refresh-token' }),
  })
  // GoTrue typically returns 400 with error_code/refresh_token_not_found
  const badRefreshDenied = badRefresh.status >= 400 && badRefresh.status < 500 && !badRefresh.json?.access_token
  record({
    id: 'b6b.invalid_refresh_denied',
    description: 'invalid refresh token returns 4xx (no infinite-refresh path)',
    pass: badRefreshDenied,
    status: badRefresh.status,
    latencyMs: badRefresh.latencyMs,
    detail: badRefreshDenied ? null : `unexpectedly accepted: ${badRefresh.text}`,
  })

  // Invalid access token on a protected request
  const badAccess = await http(`/rest/v1/users?select=id&id=eq.${userA.userId}`, {}, 'eyJhbGciOiJIUzI1NiJ9.invalid.signature')
  // PostgREST usually returns 401 with JWSError
  const badAccessDenied = badAccess.status === 401
  record({
    id: 'b6b.invalid_access_denied',
    description: 'invalid access token on PostgREST returns 401',
    pass: badAccessDenied,
    status: badAccess.status,
    latencyMs: badAccess.latencyMs,
    detail: badAccessDenied ? null : badAccess.text,
  })

  return finish({ userA, userB })

  // ----- finish helper -----
  async function finish(state = {}) {
    const total = checks.length
    const passed = checks.filter(c => c.pass).length
    const failed = total - passed

    console.log(`\n=== SUMMARY ===`)
    console.log(`Total: ${total}   Passed: ${passed}   Failed: ${failed}`)

    // Cleanup
    if (state.userA?.userId) await adminDeleteUser(state.userA.userId)
    if (state.userB?.userId) await adminDeleteUser(state.userB.userId)
    console.log('cleaned up test users')

    mkdirSync('evidence', { recursive: true })
    const date = RUN_AT.slice(0, 10)
    const jsonPath = `evidence/auth-slice-http-${date}.json`
    const mdPath = `evidence/auth-slice-http-${date}.md`

    writeFileSync(jsonPath, JSON.stringify({ runAt: RUN_AT, url: URL, summary: { total, passed, failed }, checks }, null, 2))

    const lines = []
    lines.push(`# Auth slice — HTTP layer — ${date}`)
    lines.push('')
    lines.push(`**Run at:** ${RUN_AT}`)
    lines.push(`**Target:** ${URL}`)
    lines.push(`**Result:** ${failed === 0 ? 'PASS' : 'FAIL'}  (${passed}/${total})`)
    lines.push('')
    lines.push(`## Behaviors covered`)
    lines.push(`- B1 signup + confirm + signin`)
    lines.push(`- B2 own-row SELECT`)
    lines.push(`- B3 cross-user RLS isolation`)
    lines.push(`- B6a refresh issues new JWT`)
    lines.push(`- B6b invalid token denied`)
    lines.push(`- (B4 SSR reload + B5 multi-tab logout deferred to Playwright)`)
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
      for (const c of checks.filter(x => !x.pass)) {
        lines.push(`- **${c.id}**: ${c.description}`)
        lines.push(`  - status=${c.status} detail=\`${(c.detail || '').replace(/`/g, "'").slice(0, 300)}\``)
      }
    }
    writeFileSync(mdPath, lines.join('\n'))
    console.log(`Wrote ${jsonPath} and ${mdPath}`)
    process.exit(failed === 0 ? 0 : 1)
  }
}

main().catch(e => { console.error('Probe crashed:', e); process.exit(2) })
