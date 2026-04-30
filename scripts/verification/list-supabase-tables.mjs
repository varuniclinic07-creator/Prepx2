#!/usr/bin/env node
// Probe a candidate list of table names against the live Supabase REST API.
// We can't get a directory listing with anon key (RLS blocks information_schema),
// so we probe each candidate from the migration files.
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) { console.error('missing supabase env'); process.exit(2) }

// Pull table names from migration files
const dir = 'supabase/migrations'
const re = /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi
const tables = new Set()
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.sql')) continue
  const sql = readFileSync(`${dir}/${f}`, 'utf8')
  let m
  while ((m = re.exec(sql))) tables.add(m[1])
}
console.log(`Found ${tables.size} unique table names across migration files`)

const results = []
for (const t of [...tables].sort()) {
  const ac = new AbortController()
  const to = setTimeout(() => ac.abort(), 8000)
  try {
    const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: ac.signal,
    })
    const text = await res.text()
    let verdict = 'unknown'
    if (res.status === 200 || res.status === 206) verdict = 'exists'
    else if (res.status === 401 || res.status === 403) verdict = 'exists-rls-blocked'
    else if (res.status === 404 || /42P01/.test(text)) verdict = 'MISSING'
    else verdict = `status-${res.status}`
    results.push({ table: t, status: res.status, verdict })
    console.log(`${t.padEnd(40)} ${res.status}  ${verdict}`)
  } catch (e) {
    results.push({ table: t, status: 0, verdict: 'error', error: e.message })
    console.log(`${t.padEnd(40)} ERR  ${e.message}`)
  } finally { clearTimeout(to) }
}

const present = results.filter(r => r.verdict === 'exists' || r.verdict === 'exists-rls-blocked')
const missing = results.filter(r => r.verdict === 'MISSING')
console.log(`\n=== SUMMARY ===`)
console.log(`Tables in migration files: ${results.length}`)
console.log(`Present in DB:             ${present.length}`)
console.log(`Missing from DB:           ${missing.length}`)
console.log(`Other:                     ${results.length - present.length - missing.length}`)
if (missing.length) {
  console.log('\nMissing tables:')
  for (const m of missing) console.log(`  - ${m.table}`)
}

mkdirSync('evidence', { recursive: true })
writeFileSync('evidence/supabase-table-inventory.json', JSON.stringify({ url, results, runAt: new Date().toISOString() }, null, 2))
console.log('\nWrote evidence/supabase-table-inventory.json')
