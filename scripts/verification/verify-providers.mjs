#!/usr/bin/env node
// Real HTTP verification — one OpenAI-compatible chat call per provider.
// No mocks. No fallbacks. Records exact status, latency, and response.
//
// Usage:  node --env-file=.env.local scripts/verification/verify-providers.mjs

import { writeFileSync, mkdirSync } from 'node:fs'

const PROMPT = 'reply with exactly one word: ok'
const TIMEOUT_MS = 30000

const results = []

async function callOpenAICompatible({ provider, label, baseUrl, apiKey, model, extraHeaders = {} }) {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const body = {
    model,
    messages: [{ role: 'user', content: PROMPT }],
    max_tokens: 64,
    temperature: 0,
    stream: false,
  }
  const started = Date.now()
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    })
    const latency = Date.now() - started
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}

    // Extract content from JSON OR SSE stream
    let content = json?.choices?.[0]?.message?.content
                ?? json?.choices?.[0]?.message?.reasoning
                ?? null
    if (!content && text.startsWith('data:')) {
      const deltas = []
      for (const line of text.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const chunk = JSON.parse(payload)
          const delta = chunk?.choices?.[0]?.delta?.content ?? chunk?.choices?.[0]?.message?.content
          if (delta) deltas.push(delta)
        } catch {}
      }
      if (deltas.length) content = deltas.join('')
    }

    const errMsg = json?.error?.message ?? json?.message ?? null
    // Treat as OK if HTTP 200 + we got non-empty content OR explicit reasoning text
    const ok = res.ok && !!content && content.trim().length > 0
    return {
      provider, label, model, baseUrl,
      status: res.status,
      ok,
      latencyMs: latency,
      content: content?.slice(0, 200) ?? null,
      error: errMsg,
      bodySample: text.slice(0, 400),
    }
  } catch (e) {
    return {
      provider, label, model, baseUrl,
      status: 0,
      ok: false,
      latencyMs: Date.now() - started,
      content: null,
      error: e?.message ?? String(e),
      bodySample: null,
    }
  } finally {
    clearTimeout(t)
  }
}

function need(k) {
  const v = process.env[k]
  if (!v) console.error(`Missing env: ${k}`)
  return v
}

async function main() {
  // 1. Ollama Cloud
  results.push(await callOpenAICompatible({
    provider: 'ollama-cloud',
    label: 'ollama-cloud / deepseek-v4-pro:cloud',
    baseUrl: need('OLLAMA_BASE_URL'),
    apiKey: need('OLLAMA_API_KEY'),
    model: need('OLLAMA_MODEL'),
  }))

  // 2. Groq — try all 7 keys, llama-3.3-70b-versatile
  const groqModel = need('GROQ_MODEL')
  for (let i = 1; i <= 7; i++) {
    const key = process.env[`GROQ_API_KEY_${i}`]
    if (!key) continue
    results.push(await callOpenAICompatible({
      provider: 'groq',
      label: `groq / key-${i} / ${groqModel}`,
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: key,
      model: groqModel,
    }))
  }

  // 3. 9router
  results.push(await callOpenAICompatible({
    provider: '9router',
    label: '9router / kr/claude-sonnet-4.5',
    baseUrl: need('NINEROUTER_BASE_URL'),
    apiKey: need('NINEROUTER_API_KEY'),
    model: need('NINEROUTER_MODEL'),
  }))

  // 4. Kilo — sweep all 5 models with key-1, then verify keys 2/3/4 with the most reliable model.
  const kiloBase = need('KILO_BASE_URL')
  const kiloKey1 = need('KILO_API_KEY_1')
  for (let m = 1; m <= 5; m++) {
    const model = process.env[`KILO_MODEL_${m}`]
    if (!model) continue
    results.push(await callOpenAICompatible({
      provider: 'kilo',
      label: `kilo / key-1 / ${model}`,
      baseUrl: kiloBase,
      apiKey: kiloKey1,
      model,
    }))
  }
  // Validate keys 2/3/4 against kilo-auto/free
  for (let k = 2; k <= 4; k++) {
    const key = process.env[`KILO_API_KEY_${k}`]
    if (!key) continue
    results.push(await callOpenAICompatible({
      provider: 'kilo',
      label: `kilo / key-${k} / kilo-auto/free`,
      baseUrl: kiloBase,
      apiKey: key,
      model: 'kilo-auto/free',
    }))
  }

  // 5. NVIDIA NIM — test each declared model with the single key
  const nvidiaKey = need('NVIDIA_API_KEY')
  const nvidiaBase = need('NVIDIA_BASE_URL')
  for (let m = 1; m <= 7; m++) {
    const model = process.env[`NVIDIA_MODEL_${m}`]
    if (!model) continue
    results.push(await callOpenAICompatible({
      provider: 'nvidia',
      label: `nvidia / ${model}`,
      baseUrl: nvidiaBase,
      apiKey: nvidiaKey,
      model,
    }))
  }

  // 6. Opencode (self-hosted localhost)
  const opencodeBase = need('OPENCODE_BASE_URL')
  const opencodeKey = need('OPENCODE_API_KEY')
  for (let m = 1; m <= 2; m++) {
    const model = process.env[`OPENCODE_MODEL_${m}`]
    if (!model) continue
    results.push(await callOpenAICompatible({
      provider: 'opencode',
      label: `opencode / ${model}`,
      baseUrl: opencodeBase,
      apiKey: opencodeKey,
      model,
    }))
  }

  // Print summary
  console.log('\n=== PROVIDER VERIFICATION RESULTS ===\n')
  for (const r of results) {
    const flag = r.ok ? 'OK   ' : 'FAIL '
    console.log(`${flag} [${r.status}] ${r.latencyMs}ms  ${r.label}`)
    if (!r.ok) console.log(`        error: ${r.error || r.bodySample?.slice(0, 200)}`)
    else console.log(`        reply: ${JSON.stringify(r.content)}`)
  }

  // Per-provider verdict
  const byProvider = new Map()
  for (const r of results) {
    if (!byProvider.has(r.provider)) byProvider.set(r.provider, [])
    byProvider.get(r.provider).push(r)
  }

  console.log('\n=== PER-PROVIDER VERDICT ===\n')
  const verdicts = {}
  for (const [provider, rs] of byProvider) {
    const passing = rs.filter(r => r.ok)
    const verdict = passing.length === rs.length
      ? 'verified'
      : passing.length > 0
        ? 'partial'
        : 'failed'
    verdicts[provider] = { verdict, passing: passing.length, total: rs.length, workingModels: passing.map(r => r.model) }
    console.log(`${provider.padEnd(15)} ${verdict.padEnd(10)} ${passing.length}/${rs.length} working`)
    for (const r of passing) console.log(`  WORKS: ${r.model}`)
  }

  mkdirSync('evidence', { recursive: true })
  writeFileSync('evidence/provider-verification-raw.json', JSON.stringify({ results, verdicts, runAt: new Date().toISOString() }, null, 2))
  console.log('\nWrote evidence/provider-verification-raw.json')

  const anyFailed = results.some(r => !r.ok)
  process.exit(anyFailed ? 1 : 0)
}

main().catch(e => {
  console.error('Verification script crashed:', e)
  process.exit(2)
})
