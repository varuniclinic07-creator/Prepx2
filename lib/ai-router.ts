import OpenAI from 'openai';

// ────────────────────────────────
// Multi-Tier AI Provider Router
// Tier 1: 9router | Tier 2: Ollama | Tier 3: Groq (7 keys) | Tier 4: Kilo (4 keys) | Tier 5: NVIDIA
// ────────────────────────────────

// Helper to load env with fallback
const env = (k: string, d?: string) => process.env[k] || d || '';

// ── Tier 1: 9router (Primary) ──
function nineRouter(): { client: OpenAI; model: string; keyId: string } {
  return {
    client: new OpenAI({ baseURL: env('NINEROUTER_BASE_URL'), apiKey: env('NINEROUTER_API_KEY'), timeout: 60000 }),
    model: env('NINEROUTER_MODEL', 'kr/claude-sonnet-4.5'),
    keyId: '9router',
  };
}

// ── Tier 2: Ollama Cloud ──
function ollama(): { client: OpenAI; model: string; keyId: string } {
  return {
    client: new OpenAI({ baseURL: env('OLLAMA_BASE_URL', 'https://ollama.com/v1'), apiKey: env('OLLAMA_API_KEY'), timeout: 90000 }),
    model: env('OLLAMA_MODEL', 'gemma4:31b-cloud'),
    keyId: 'ollama',
  };
}

// ── Tier 3: Groq (7 keys, round-robin) ──
const GROQ_KEYS = [
  env('GROQ_API_KEY_1'), env('GROQ_API_KEY_2'), env('GROQ_API_KEY_3'),
  env('GROQ_API_KEY_4'), env('GROQ_API_KEY_5'), env('GROQ_API_KEY_6'), env('GROQ_API_KEY_7'),
].filter(Boolean);
let groqIndex = 0;
function groqInstance(): { client: OpenAI; model: string; keyId: string } {
  if (GROQ_KEYS.length === 0) throw new Error('No Groq keys configured');
  const key = GROQ_KEYS[groqIndex % GROQ_KEYS.length];
  groqIndex = (groqIndex + 1) % GROQ_KEYS.length;
  return {
    client: new OpenAI({ baseURL: env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'), apiKey: key, timeout: 30000 }),
    model: env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
    keyId: `groq-${groqIndex}`,
  };
}

// ── Tier 4: Kilo AI (4 keys, 5 models, round-robin) ──
const KILO_KEYS = [
  env('KILO_API_KEY_1'), env('KILO_API_KEY_2'), env('KILO_API_KEY_3'), env('KILO_API_KEY_4'),
].filter(Boolean);
const KILO_MODELS = [
  env('KILO_MODEL_1', 'kilo-auto/free'), env('KILO_MODEL_2', 'openrouter/free'),
  env('KILO_MODEL_3', 'bytedance-seed/dola-seed-2.0-pro:free'), env('KILO_MODEL_4', 'nvidia/nemotron-3-super-120b-a12b:free'),
  env('KILO_MODEL_5', 'x-ai/grok-code-fast-1:optimized:free'),
];
let kiloKeyIdx = 0, kiloModelIdx = 0;
function kiloInstance(): { client: OpenAI; model: string; keyId: string } {
  if (KILO_KEYS.length === 0) throw new Error('No Kilo keys configured');
  const key = KILO_KEYS[kiloKeyIdx % KILO_KEYS.length];
  const model = KILO_MODELS[kiloModelIdx % KILO_MODELS.length];
  kiloKeyIdx = (kiloKeyIdx + 1) % KILO_KEYS.length;
  kiloModelIdx = (kiloModelIdx + 1) % KILO_MODELS.length;
  return {
    client: new OpenAI({ baseURL: env('KILO_BASE_URL', 'https://api.kilo.ai/api/gateway'), apiKey: key, timeout: 60000 }),
    model,
    keyId: `kilo-${kiloKeyIdx}/${kiloModelIdx}`,
  };
}

// ── Tier 5: NVIDIA (fallback models) ──
const NVIDIA_MODELS = [
  env('NVIDIA_MODEL_1', 'nvidia/llama-3.3-nemotron-super-49b-v1.5'),
  env('NVIDIA_MODEL_2', 'nvidia/glm'),
  env('NVIDIA_MODEL_3', 'nemotron-3-super-free'),
  env('NVIDIA_MODEL_4', 'nvidia/qwen3.5-397b-a17b'),
  env('NVIDIA_MODEL_5', 'nvidia/mistral-large-3-675b-instruct-2512'),
];
let nvidiaIdx = 0;
function nvidiaInstance(): { client: OpenAI; model: string; keyId: string } {
  const model = NVIDIA_MODELS[nvidiaIdx % NVIDIA_MODELS.length];
  nvidiaIdx = (nvidiaIdx + 1) % NVIDIA_MODELS.length;
  return {
    client: new OpenAI({ baseURL: env('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'), apiKey: env('NVIDIA_API_KEY'), timeout: 60000 }),
    model,
    keyId: `nvidia-${nvidiaIdx}`,
  };
}

// ── Ordered provider list for fallback ──
type ProviderFactory = () => { client: OpenAI; model: string; keyId: string };
const PROVIDERS: ProviderFactory[] = [nineRouter, ollama, groqInstance, kiloInstance, nvidiaInstance];

// ── Circuit breaker per provider ──
const CB = new Map<string, { failures: number; lastFailAt: number; open: boolean }>();
const CB_THRESHOLD = 3;
const CB_COOLDOWN_MS = 60_000;

function cbState(key: string) {
  let s = CB.get(key);
  if (!s) { s = { failures: 0, lastFailAt: 0, open: false }; CB.set(key, s); }
  if (s.open && Date.now() - s.lastFailAt > CB_COOLDOWN_MS) { s.open = false; s.failures = 0; }
  return s;
}
function cbFail(key: string) {
  const s = cbState(key);
  s.failures++;
  s.lastFailAt = Date.now();
  if (s.failures >= CB_THRESHOLD) s.open = true;
}
function cbSuccess(key: string) { CB.set(key, { failures: 0, lastFailAt: 0, open: false }); }

// ── Public interface ──
export async function aiChat(opts: {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const { messages, temperature = 0.4, maxTokens = 4000, jsonMode = false } = opts;
  const lastErrs: string[] = [];

  for (const factory of PROVIDERS) {
    const { client, model, keyId } = factory();
    const state = cbState(keyId);
    if (state.open) { lastErrs.push(`${keyId}: circuit open`); continue; }

    try {
      const chat = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
      });
      const text = chat.choices?.[0]?.message?.content || '';
      cbSuccess(keyId);
      return text;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`[AI Router] ${keyId} FAILED: ${msg.slice(0, 200)}`);
      cbFail(keyId);
      lastErrs.push(`${keyId}: ${msg.slice(0, 120)}`);
    }
  }
  throw new Error(`All AI providers failed. Errors: ${lastErrs.join(' | ')}`);
}

// ── Embeddings ──
export async function embedText(texts: string[]): Promise<number[][]> {
  const baseURL = env('NINEROUTER_BASE_URL');
  const apiKey = env('NINEROUTER_EMBEDDING_KEY');
  const model = env('NINEROUTER_EMBEDDING_MODEL', 'gemini/gemini-embedding-2-preview');
  const client = new OpenAI({ baseURL, apiKey, timeout: 30000 });
  const res = await client.embeddings.create({ model, input: texts });
  return res.data.map((d: any) => d.embedding);
}

// ── TTS ──
export async function textToSpeech(text: string): Promise<Buffer> {
  const baseURL = env('NINEROUTER_BASE_URL');
  const apiKey = env('NINEROUTER_TTS_KEY');
  const model = env('NINEROUTER_TTS_MODEL', 'google-tts/en');
  const res = await fetch(`${baseURL}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: text }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── Legacy re-exports ──
export async function generateQuiz(topicTitle: string, content: string, count: number = 5) {
  const raw = await aiChat({
    messages: [
      { role: 'system', content: 'You are a UPSC quiz generator. Generate MCQs in JSON array format.' },
      { role: 'user', content: `Generate ${count} UPSC Prelims MCQs for "${topicTitle}". Content: ${content.slice(0, 3000)}\n\nFormat: [{"question":"...","options":["A","B","C","D"],"correct_option":"A","explanation":"..."}]` },
    ],
    jsonMode: true,
    temperature: 0.3,
    maxTokens: 2000,
  });
  try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : parsed.questions || []; } catch { return []; }
}

export async function classifyError(score: number, wrong: number, skipped: number) {
  const raw = await aiChat({
    messages: [
      { role: 'system', content: 'You classify UPSC errors. Return JSON.' },
      { role: 'user', content: `Score ${score}, wrong ${wrong}, skipped ${skipped}. Return JSON: {"silly":N,"concept":N,"time":N}` },
    ],
    jsonMode: true,
    temperature: 0.2,
    maxTokens: 200,
  });
  try { return JSON.parse(raw); } catch { return { silly: 0, concept: 0, time: 0 }; }
}

export async function generateDiagnosis(weakAreas: string[]) {
  if (!weakAreas.length) return 'No weak areas detected.';
  return aiChat({
    messages: [
      { role: 'system', content: 'You are a UPSC study coach. Be direct and actionable.' },
      { role: 'user', content: `Weak areas: ${weakAreas.join(', ')}. Give 2-3 sentences diagnosis and 1 action item.` },
    ],
    temperature: 0.3,
    maxTokens: 300,
  });
}

export async function generateContentSummary(topicTitle: string, body: string) {
  return aiChat({
    messages: [
      { role: 'system', content: 'You are a UPSC content summarizer. Keep it exam-relevant.' },
      { role: 'user', content: `Topic: ${topicTitle}\n\n${body}\n\nSum it up in 3 bullets and a 50-word paragraph.` },
    ],
    temperature: 0.35,
    maxTokens: 400,
  });
}
