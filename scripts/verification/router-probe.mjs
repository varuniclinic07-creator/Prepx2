// Probe every AI tier individually so we can see exactly which one is 403'ing.
// Run: node --env-file=.env.local scripts/verification/router-probe.mjs
import OpenAI from 'openai';

const env = (k, d) => process.env[k] ?? d;
const tiers = [
  { name: '9router', baseURL: env('NINEROUTER_BASE_URL'), apiKey: env('NINEROUTER_API_KEY'), model: env('NINEROUTER_MODEL', 'kr/claude-sonnet-4.5') },
  { name: 'ollama',  baseURL: env('OLLAMA_BASE_URL', 'https://ollama.com/v1'), apiKey: env('OLLAMA_API_KEY'), model: env('OLLAMA_MODEL', 'gemma4:31b-cloud') },
  { name: 'groq-1',  baseURL: env('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'), apiKey: env('GROQ_API_KEY_1'), model: env('GROQ_MODEL', 'llama-3.3-70b-versatile') },
  { name: 'kilo-1',  baseURL: env('KILO_BASE_URL', 'https://api.kilo.ai/api/gateway'), apiKey: env('KILO_API_KEY_1'), model: env('KILO_MODEL_1', 'kilo-auto/free') },
  { name: 'nvidia-1', baseURL: env('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'), apiKey: env('NVIDIA_API_KEY'), model: env('NVIDIA_MODEL_1', 'nvidia/llama-3.3-nemotron-super-49b-v1.5') },
];

for (const t of tiers) {
  if (!t.apiKey) { console.log(`SKIP  ${t.name.padEnd(9)} (no key in env)`); continue; }
  const c = new OpenAI({ baseURL: t.baseURL, apiKey: t.apiKey, timeout: 25000 });
  try {
    const r = await c.chat.completions.create({
      model: t.model,
      messages: [{ role: 'user', content: 'reply with the single word OK' }],
      max_tokens: 10,
      temperature: 0,
    });
    const text = r.choices?.[0]?.message?.content?.slice(0, 40) || '';
    console.log(`PASS  ${t.name.padEnd(9)} model=${t.model.padEnd(50)} -> ${text.replace(/\n/g, ' ')}`);
  } catch (e) {
    const msg = (e?.message || String(e)).slice(0, 240).replace(/\n/g, ' ');
    console.log(`FAIL  ${t.name.padEnd(9)} model=${t.model.padEnd(50)} -> ${msg}`);
  }
}
