---
sprint: 2
story: "4.2: Multi-Provider AI Router with Fallback"
status: completed
date: 2026-04-22
files: lib/ai-router.ts, lib/openai.ts, .env.example
acceptance:
  - 5-tier failover (Ollama → Groq → 9router → NVIDIA → Kilo)
  - Circuit breaker (3 failures → 60s open)
  - Key rotation for Groq (7) and Kilo (4)
  - Model rotation for Kilo (4 models)
  - OpenAI SDK compatibility per provider
