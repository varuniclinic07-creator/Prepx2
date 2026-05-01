#!/usr/bin/env node
// Rewrites supabase/seed.sql and supabase/seed-quizzes.sql to be applyable
// against the live schema (post-migration 045).
//
// Fixes:
//   1. Topic id column: replace string IDs ('polity-001') with deterministic
//      UUIDs from slug: uuid_generate_v5(uuid_ns_url(), 'prepx-topic-<slug>').
//   2. JSONB apostrophes: every unescaped ' inside a JSONB literal becomes ''.
//   3. districts: drop geojson column from INSERT (column doesn't exist).
//   4. users admin INSERT: comment out (FK to auth.users — needs separate
//      service-role admin API call post-seed).
//   5. quizzes: drop id column (let DB default generate); rewrite topic_id
//      to uuid_generate_v5 with same namespace so FK matches topics.id.
//
// Reads .bak originals; writes new seed.sql / seed-quizzes.sql.

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..', '..')
const SEED_SRC = resolve(ROOT, 'supabase/seed.sql.bak')
const QUIZ_SRC = resolve(ROOT, 'supabase/seed-quizzes.sql.bak')
const SEED_OUT = resolve(ROOT, 'supabase/seed.sql')
const QUIZ_OUT = resolve(ROOT, 'supabase/seed-quizzes.sql')

const NS = 'uuid_ns_url()'
const slugToUuid = (slug) =>
  `uuid_generate_v5(${NS}, 'prepx-topic-${slug}')`

// Doubles every single quote inside a JSONB string literal that isn't already
// part of a doubled pair. Input is the inner content between the outer quotes;
// output replaces every ' with ''.
function escapeJsonbApostrophes(inner) {
  // Already-escaped '' must stay as '' (don't quadruple). Strategy: collapse
  // any existing '' to a sentinel, double remaining ', then restore.
  const SENTINEL = '\x00ESC\x00'
  return inner.replace(/''/g, SENTINEL).replace(/'/g, "''").replace(new RegExp(SENTINEL, 'g'), "''")
}

// Parse a topic INSERT row: ('<slug>', '<title>', '<subject>', '<tag>', '<JSONB>', <num>)
// where <JSONB> begins with `{` and ends with `}`. Title/subject/tag never contain
// apostrophes (verified by grep). The closing of JSONB is the LAST `}'` before
// `, <num>)`.
//
// nullTag: if true, the row's syllabus_tag is emitted as NULL instead of its
// quoted string. Used for the first-block topics (topic-001..015) whose tags
// collide with the auto-generated polity-001..-style block.
function rewriteTopicRow(rowText, nullTag = false) {
  // rowText looks like: ('polity-001', 'Title', 'subject', 'tag', '{...}', 75),
  // or ends with );
  // Strip trailing ),  or );  for parsing
  const trailingMatch = rowText.match(/(\)[,;]?\s*)$/)
  const trailing = trailingMatch ? trailingMatch[1] : ')'
  let body = rowText.slice(0, rowText.length - trailing.length)
  // body now: ('polity-001', 'Title', 'subject', 'tag', '{...}', 75
  if (!body.startsWith('(')) return rowText
  body = body.slice(1) // strip leading (

  // Find the slug (first quoted string)
  const m1 = body.match(/^'([^']+)',\s*/)
  if (!m1) return rowText
  const slug = m1[1]
  let rest = body.slice(m1[0].length)

  // Title
  const m2 = rest.match(/^'([^']*)',\s*/)
  if (!m2) return rowText
  const title = m2[1]
  rest = rest.slice(m2[0].length)

  // Subject
  const m3 = rest.match(/^'([^']*)',\s*/)
  if (!m3) return rowText
  const subject = m3[1]
  rest = rest.slice(m3[0].length)

  // Syllabus tag
  const m4 = rest.match(/^'([^']*)',\s*/)
  if (!m4) return rowText
  const tag = m4[1]
  rest = rest.slice(m4[0].length)

  // JSONB: starts with `'{`, ends with `}'`. Find last `}'` before `, <num>`.
  if (!rest.startsWith("'{")) return rowText
  // Find the closing `}'` followed by `, <number>` at the end
  const closeMatch = rest.match(/}'\s*,\s*([0-9.]+)\s*$/)
  if (!closeMatch) return rowText
  const score = closeMatch[1]
  const closeIdx = rest.length - closeMatch[0].length
  const jsonbInner = rest.slice(2, closeIdx) + '}' // include the closing brace
  // Wait — closeIdx points to the `}` of `}'`. Re-extract:
  // rest = "'{...}', 75"
  // closeMatch[0] = "}'  , 75"
  // We want jsonb = "{...}" (without outer single quotes)
  // closeIdx = rest.length - closeMatch[0].length is position of `}` (start of close marker)
  const jsonbBody = rest.slice(1, closeIdx + 1) // from char after opening ' (i.e., '{') through '}' inclusive — actually from index 1 (the `{`) to closeIdx+1
  // Note: rest[0]=`'`, rest[1]=`{`, ..., rest[closeIdx]=`}`, rest[closeIdx+1]=`'`
  const jsonbEscaped = escapeJsonbApostrophes(jsonbBody)

  const tagSql = nullTag ? 'NULL' : `'${tag}'`
  return `(${slugToUuid(slug)}, '${title}', '${subject}', ${tagSql}, '${jsonbEscaped}', ${score}${trailing}`
}

function rewriteSeedSql() {
  const src = readFileSync(SEED_SRC, 'utf8')
  const lines = src.split(/\r?\n/)
  const out = []
  let mode = 'normal'
  let topicBlockIdx = 0  // 1 = small subset block, 2 = auto-generated block
  // mode: 'normal' | 'topics' | 'admin' | 'districts' | 'astra'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect block starts
    if (/^INSERT INTO topics \(id, title, subject, syllabus_tag, content, readability_score\) VALUES/.test(line)) {
      out.push(line)
      mode = 'topics'
      topicBlockIdx++
      continue
    }
    if (/^INSERT INTO users \(/.test(line)) {
      mode = 'admin'
      out.push(`-- Admin user INSERT commented out: users.id has FK to auth.users.`)
      out.push(`-- Apply post-seed via service-role admin API instead. Original block:`)
      out.push(`-- ${line}`)
      continue
    }
    if (/^INSERT INTO districts \(name, state, geojson, center_lat, center_lng\) VALUES/.test(line)) {
      out.push(`INSERT INTO districts (name, state, center_lat, center_lng) VALUES`)
      mode = 'districts'
      continue
    }
    if (/^INSERT INTO astra_scripts/.test(line)) {
      out.push(line)
      mode = 'astra'
      continue
    }

    if (mode === 'topics') {
      if (line.trim().startsWith("('")) {
        // First block (topic-001..015) collides with auto-gen block on syllabus_tag.
        // Per user decision: null out tags on the small block; keep on the canonical block.
        out.push(rewriteTopicRow(line, topicBlockIdx === 1))
      } else {
        out.push(line)
        if (line.trim().endsWith(';') || line.trim() === '') mode = 'normal'
      }
      continue
    }

    if (mode === 'admin') {
      out.push(`-- ${line}`)
      if (line.trim().endsWith(';')) mode = 'normal'
      continue
    }

    if (mode === 'astra') {
      // Each row: ('Topic', 'subject', '[JSONB]', 'rendered', 'en')[,;]
      // Topic and subject have no apostrophes. Only JSONB needs escaping.
      // Find the JSONB literal (third quoted column, starts with '[ and ends with ]').
      const m = line.match(/^(\('[^']+',\s*'[^']+',\s*')(\[[\s\S]*?\])('\s*,\s*'[^']+',\s*'[^']+'\)[,;]?)\s*$/)
      if (m) {
        const escaped = escapeJsonbApostrophes(m[2])
        out.push(`${m[1]}${escaped}${m[3]}`)
      } else {
        out.push(line)
      }
      if (line.trim().endsWith(';')) mode = 'normal'
      continue
    }

    if (mode === 'districts') {
      // Each row: ('Name', 'State', 'polygon', lat, lng),
      const m = line.match(/^\('([^']+)',\s*'([^']+)',\s*'[^']+',\s*([\d.]+),\s*([\d.]+)\)([,;]?)\s*$/)
      if (m) {
        out.push(`('${m[1]}', '${m[2]}', ${m[3]}, ${m[4]})${m[5]}`)
        if (m[5] === ';') mode = 'normal'
      } else {
        out.push(line)
        if (line.trim().endsWith(';') || line.trim() === '') mode = 'normal'
      }
      continue
    }

    out.push(line)
  }

  writeFileSync(SEED_OUT, out.join('\n'))
  console.log(`Wrote ${SEED_OUT} (${out.length} lines)`)
}

function rewriteSeedQuizzes() {
  const src = readFileSync(QUIZ_SRC, 'utf8')
  const lines = src.split(/\r?\n/)
  const out = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^INSERT INTO quizzes \(id, topic_id, questions\) VALUES/.test(line)) {
      out.push(`INSERT INTO quizzes (topic_id, questions) VALUES`)
      continue
    }

    // Quiz row: ('polity-001-quiz', 'polity-001', '[...]'),
    // We drop the id column and rewrite topic_id to uuid_generate_v5.
    if (line.trim().startsWith("('")) {
      // Match: ('<id>', '<topic_slug>', '<json>')<trailing>
      // The JSON literal can contain ' but in this file it doesn't (audited);
      // however we'll still escape conservatively.
      const trailingMatch = line.match(/(\)[,;]?\s*)$/)
      const trailing = trailingMatch ? trailingMatch[1] : ')'
      let body = line.slice(0, line.length - trailing.length)
      if (!body.startsWith('(')) { out.push(line); continue }
      body = body.slice(1)

      const m1 = body.match(/^'([^']+)',\s*/)
      if (!m1) { out.push(line); continue }
      // const _quizId = m1[1]  // dropped
      let rest = body.slice(m1[0].length)

      const m2 = rest.match(/^'([^']+)',\s*/)
      if (!m2) { out.push(line); continue }
      const topicSlug = m2[1]
      rest = rest.slice(m2[0].length)

      // rest now: '[...json...]'
      if (!rest.startsWith("'") || !rest.endsWith("'")) { out.push(line); continue }
      const jsonInner = rest.slice(1, -1)
      const jsonEscaped = escapeJsonbApostrophes(jsonInner)

      out.push(`(${slugToUuid(topicSlug)}, '${jsonEscaped}'${trailing}`)
      continue
    }

    out.push(line)
  }

  writeFileSync(QUIZ_OUT, out.join('\n'))
  console.log(`Wrote ${QUIZ_OUT} (${out.length} lines)`)
}

rewriteSeedSql()
rewriteSeedQuizzes()
