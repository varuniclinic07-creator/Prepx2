#!/usr/bin/env node
// Real Supabase connectivity check.
// Usage:  node --env-file=.env.local scripts/verification/verify-supabase.mjs

import { writeFileSync, mkdirSync } from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(2)
}

const TIMEOUT_MS = 15000

async function call(path, init = {}) {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
      signal: ac.signal,
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - started, json, text: text.slice(0, 800) }
  } catch (e) {
    return { ok: false, status: 0, latencyMs: Date.now() - started, error: e?.message ?? String(e) }
  } finally {
    clearTimeout(t)
  }
}

const expectedTables = [
  'users',
  'user_balances',
  'coin_transactions',
  'subjects',
  'topics',
  'questions',
  'quizzes',
  'quiz_attempts',
  'quiz_answers',
  'daily_plans',
  'user_sessions',
  'agent_tasks',
  'battles',
  'territories',
  'essay_submissions',
  'white_label_tenants',
  'subscriptions',
  'payments',
]

async function main() {
  const checks = {}

  // 1. Root reachable
  console.log(`Hitting ${url} ...`)
  const root = await call('/')
  checks.root = root
  console.log(`  root: status=${root.status} ${root.latencyMs}ms`)

  // 2. PostgREST root (lists schema)
  const rest = await call('/rest/v1/')
  checks.rest = rest
  console.log(`  /rest/v1/: status=${rest.status} ${rest.latencyMs}ms`)

  // 3. Auth health
  const authHealth = await call('/auth/v1/health')
  checks.authHealth = authHealth
  console.log(`  /auth/v1/health: status=${authHealth.status} ${authHealth.latencyMs}ms`)

  // 4. Table-by-table existence check (HEAD-style: count=exact, limit=0)
  const tableResults = []
  console.log('\nChecking ' + expectedTables.length + ' expected tables...')
  for (const t of expectedTables) {
    const r = await call(`/rest/v1/${t}?select=*&limit=0`, { method: 'GET', headers: { Prefer: 'count=exact' } })
    const exists = r.status === 200 || r.status === 206
    const rlsBlocked = r.status === 401 || r.status === 403
    const missing = r.status === 404 || (r.json?.code === '42P01')
    let verdict = 'unknown'
    if (exists) verdict = 'exists'
    else if (rlsBlocked) verdict = 'exists-rls-blocked'
    else if (missing) verdict = 'MISSING'
    else verdict = `status-${r.status}`
    tableResults.push({ table: t, status: r.status, verdict, body: r.text?.slice(0, 200) })
    console.log(`  ${t.padEnd(25)} ${r.status}  ${verdict}`)
  }
  checks.tables = tableResults

  // 5. Try a real auth signup to validate auth is wired
  const testEmail = `verify-${Date.now()}@example.com`
  const signup = await call('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail, password: 'TestPass123!verify' }),
  })
  checks.signup = { ...signup, testEmail }
  console.log(`\nsignup attempt (${testEmail}): status=${signup.status} ${signup.latencyMs}ms`)
  if (signup.json?.msg) console.log(`  msg: ${signup.json.msg}`)
  if (signup.json?.error) console.log(`  error: ${signup.json.error}`)
  if (signup.json?.user?.id) console.log(`  user.id: ${signup.json.user.id}`)

  // Verdicts
  const verdicts = {
    connection: root.status > 0 ? 'verified' : 'failed',
    rest: rest.ok || rest.status === 200 ? 'verified' : (rest.status > 0 ? 'partial' : 'failed'),
    auth: authHealth.ok ? 'verified' : (authHealth.status > 0 ? 'partial' : 'failed'),
    tablesPresent: tableResults.filter(t => t.verdict === 'exists' || t.verdict === 'exists-rls-blocked').length,
    tablesMissing: tableResults.filter(t => t.verdict === 'MISSING').length,
    tablesTotal: tableResults.length,
    signupWorks: signup.json?.user?.id || signup.json?.id ? 'verified' : (signup.status === 400 || signup.status === 422 ? 'partial' : 'failed'),
  }

  console.log('\n=== SUPABASE VERDICTS ===')
  console.log(JSON.stringify(verdicts, null, 2))

  mkdirSync('evidence', { recursive: true })
  writeFileSync('evidence/supabase-verification-raw.json', JSON.stringify({ url, checks, verdicts, runAt: new Date().toISOString() }, null, 2))
  console.log('\nWrote evidence/supabase-verification-raw.json')
}

main().catch(e => {
  console.error('Verification script crashed:', e)
  process.exit(2)
})
