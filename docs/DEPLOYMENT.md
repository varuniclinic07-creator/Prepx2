# PrepX Complete Deployment Guide
# One-Shot Installation: Full Stack + AI Providers + Remotion + Manim + ComfyUI

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Full Stack Installation](#2-full-stack-installation)
3. [AI Provider Setup (All 7 Tiers)](#3-ai-provider-setup-all-7-tiers)
4. [PrepX App Installation](#4-prepx-app-installation)
5. [Database Setup](#5-database-setup)
6. [Remotion Setup (Video Generation)](#6-remotion-setup-video-generation)
7. [Manim Setup (Animated Diagrams)](#7-manim-setup-animated-diagrams)
8. [ComfyUI + LTX2.3 Setup (AI Video Frames)](#8-comfyui--ltx23-setup-ai-video-frames)
9. [Astra Stream Watch Mode Pipeline](#9-astra-stream-watch-mode-pipeline)
10. [Coolify Deployment](#10-coolify-deployment)
11. [Complete Environment Variables](#11-complete-environment-variables)
12. [Verification Checklist](#12-verification-checklist)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Server | 2 vCPU, 4GB RAM | 4 vCPU, 8GB RAM |
| GPU (for ComfyUI) | Not required | NVIDIA RTX 3060+ (12GB VRAM) |
| Storage | 20GB SSD | 100GB SSD |
| OS | Ubuntu 22.04/24.04 | Ubuntu 24.04 LTS |

### Domain Requirements
- A domain pointing to your server IP (e.g., `prepx.yourdomain.com`)
- Optional: Subdomain for ComfyUI (`comfyui.yourdomain.com`)

---

## 2. Full Stack Installation

### 2.1 System Update & Base Packages

```bash
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install base dependencies
apt install -y curl wget git python3 python3-pip python3-venv \
    build-essential libpq-dev ffmpeg pkg-config \
    libcairo2-dev libpango1.0-dev libgdk-pixbuf2.0-dev \
    libffi-dev shared-mime-info

# Install Node.js 20 (via Nodesource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify installations
node -v    # Should show v20.x.x
npm -v     # Should show 10.x.x
python3 --version  # Should show 3.10+
```

### 2.2 Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install -y docker-compose-plugin

# Add user to docker group (replace with your username)
usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 2.3 FFmpeg (Required for Remotion + Manim)

```bash
apt install -y ffmpeg
ffmpeg -version | head -1
```

### 2.4 PostgreSQL Client Tools (for Supabase/local)

```bash
# Install PostgreSQL 16 client
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update && apt install -y postgresql-client-16
```

---

## 3. AI Provider Setup (All 7 Tiers)

PrepX uses a **multi-provider AI router** with circuit breaker and round-robin key rotation. You need to configure ALL providers for maximum resilience.

### 3.1 Tier 1: Ollama (Local Inference — Optional)

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3
ollama pull llama3:8b
ollama pull phi3

# Start Ollama server (background)
ollama serve &

# Test
ollama run llama3 "Say hello in Hindi"

# Note the URL (default: http://localhost:11434)
```

**Env vars:**
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=                    # Leave empty for local
OLLAMA_MODEL=llama3
```

### 3.2 Tier 2: Groq (Primary — 7 Keys for Round-Robin)

```bash
# 1. Sign up at https://console.groq.com
# 2. Create 7 API keys (Groq allows multiple keys per account)
# 3. Copy each key

# Test via curl
curl -X POST "https://api.groq.com/openai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_GROQ_KEY_1" \
  -H "Content-Type: application/json" \
  -d '{"model": "llama3-70b-8192", "messages": [{"role": "user", "content": "Hello"}]}'
```

**Available Groq Models:**
- `llama3-70b-8192` (Default — best quality)
- `llama3-8b-8192` (Faster, cheaper)
- `mixtral-8x7b-32768` (Long context)
- `gemma-7b-it` (Lightweight)

**Env vars:**
```bash
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEYS=sk_groq_key_1,sk_groq_key_2,sk_groq_key_3,sk_groq_key_4,sk_groq_key_5,sk_groq_key_6,sk_groq_key_7
GROQ_MODEL=llama3-70b-8192
```

### 3.3 Tier 3: 9router (Custom Router)

```bash
# 1. Sign up at your 9router provider
# 2. Get base URL and API key
# 3. Test with curl:

curl -X POST "https://your-9router-endpoint.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_NINEROUTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet", "messages": [{"role": "user", "content": "Hello"}]}'
```

**Env vars:**
```bash
NINEROUTER_BASE_URL=https://your-9router-endpoint.com
NINEROUTER_MODEL=claude-sonnet
NINEROUTER_API_KEY=sk_ninerouter_xxx
```

### 3.4 Tier 4: NVIDIA AI Foundation

```bash
# 1. Sign up at https://build.nvidia.com
# 2. Generate API key
# 3. Test:

curl -X POST "https://integrate.api.nvidia.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_NVIDIA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "meta/llama3-70b-instruct", "messages": [{"role": "user", "content": "Hello"}]}'
```

**Available NVIDIA Models:**
- `meta/llama3-70b-instruct`
- `meta/llama3-8b-instruct`
- `mistralai/mixtral-8x7b-instruct-v0.1`
- `google/gemma-7b`

**Env vars:**
```bash
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama3-70b-instruct
NVIDIA_API_KEY=nvapi-xxx
```

### 3.5 Tier 5: Kilo AI Gateway

```bash
# 1. Sign up at https://kilo.ai
# 2. Create 4 API keys
# 3. Test:

curl -X POST "https://api.kilo.ai/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_KILO_KEY_1" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello"}]}'
```

**Available Kilo Models:**
- `gpt-4o`
- `gpt-4o-mini`
- `claude-3-5-sonnet`
- `claude-3-haiku`

**Env vars:**
```bash
KILO_BASE_URL=https://api.kilo.ai/v1
KILO_API_KEYS=sk_kilo_key_1,sk_kilo_key_2,sk_kilo_key_3,sk_kilo_key_4
KILO_MODEL=gpt-4o
```

### 3.6 Tier 6: OpenAI Fallback

```bash
# 1. Get key from https://platform.openai.com/api-keys
# 2. Test:

curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_OPENAI_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "Hello"}]}'
```

**Env vars:**
```bash
OPENAI_API_KEY=sk-openai-xxx
```

### 3.7 Model Routing Configuration

PrepX automatically routes requests through this priority order:
```text
Ollama (local) → Groq (7 keys, round-robin) → 9router → NVIDIA → Kilo AI → OpenAI (final fallback)
```

The router automatically handles:
- **Circuit Breaker**: If a provider fails 3 times, it's disabled for 60 seconds
- **Key Rotation**: Groq and Kilo keys rotate per request
- **Fallback**: If ALL providers fail, returns error with retry guidance

**No manual routing configuration needed** — it's handled by `lib/ai-router.ts`.

---

## 4. PrepX App Installation

### 4.1 Clone Repository

```bash
# On your server (or local machine for dev)
git clone https://github.com/varuniclinic07-creator/PrepX.git
cd PrepX
```

### 4.2 Install Node.js Dependencies

```bash
# Install npm dependencies
npm ci --legacy-peer-deps

# Verify installation
ls node_modules/@next | head -5
```

### 4.3 Install TypeScript Build Tools

```bash
# TypeScript is already in devDependencies, but verify:
npx tsc --version  # Should show 5.x+

# Run type check (should pass with 0 errors)
npx tsc --noEmit
# Expected output: (no output = success)
```

### 4.4 Build the Production Bundle

```bash
# Build for production
npm run build

# The build creates:
# - .next/standalone/    ← Minimal runtime bundle
# - .next/static/        ← Static assets
# - .next/server/        ← Server-side code
```

---

## 5. Database Setup

### 5.1 Option A: Managed Supabase (Recommended)

```bash
# 1. Create project at https://supabase.com
# 2. Go to SQL Editor
# 3. Run schema:

# In Supabase SQL Editor:
\i supabase/schema.sql

# 4. Run seed data:
\i supabase/seed.sql

# 5. Enable pgvector extension:
CREATE EXTENSION IF NOT EXISTS vector;

# 6. Copy connection info from Supabase Dashboard → Settings → API
```

### 5.2 Option B: Local PostgreSQL (via Docker)

```bash
# Start PostgreSQL via docker-compose
docker compose up -d postgres

# Verify connection
docker exec -it prepx-postgres psql -U prepx -d prepx -c "\dt"

# Run schema
psql postgresql://prepx:prepx_password@localhost:5432/prepx -f supabase/schema.sql

# Run seed
psql postgresql://prepx:prepx_password@localhost:5432/prepx -f supabase/seed.sql
```

### 5.3 Verify Database

```bash
# Check tables exist
# Via psql or Supabase SQL Editor:
\dt

# Should show:
# users, topics, quizzes, daily_plans, subscriptions,
# feature_flags, agent_tasks, user_sessions, nudge_log,
# coin_transactions, user_balances, battle_royale_events,
# battle_royale_participants, user_office_ranks, districts,
# territory_ownership, isa_contracts, isa_payments,
# ai_tutors, tutor_subscriptions, white_label_tenants,
# astra_scripts, essay_colosseum_matches,
# essay_colosseum_submissions, user_predictions,
# user_notifications, user_telegrams, daily_dhwani,
# mains_attempts, squad_members, user_weak_areas
```

---

## 6. Remotion Setup (Video Generation)

**What is Remotion?**
React-based video rendering library. PrepX uses it to sequence AI-generated frames into video lectures for Astra Stream.

### 6.1 Install Remotion

```bash
# Install Remotion CLI and packages
npm install remotion @remotion/cli @remotion/player @remotion/renderer

# Install additional Remotion packages
npm install @remotion/gif @remotion/lottie @remotion/three

# Verify
npx remotion --version
```

### 6.2 Remotion Configuration

Create `remotion.config.ts` in project root:

```typescript
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// For production rendering
Config.setConcurrency(4);
Config.setPixelFormat("yuv420p");
Config.setCodec("h264");

// Output directory for rendered videos
Config.setOutputLocation("public/videos/");
```

### 6.3 Install Chromium for Remotion

```bash
# Remotion needs Chrome/Chromium for rendering
apt install -y chromium-browser

# Or via Puppeteer (auto-downloads Chrome)
npx puppeteer browsers install chrome
```

### 6.4 Astra Stream Remotion Composition

The `app/astra/page.tsx` includes a Remotion player that:
1. Takes generated script frames from `lib/astra-engine.ts`
2. Renders each frame as a timed slide with text + background
3. Sequences frames into a video player experience

**MVP Behavior:** Sequenced image slideshow (no true video rendering needed for MVP)
**P2 Enhancement:** Full Remotion video rendering with transitions

---

## 7. Manim Setup (Animated Diagrams)

**What is Manim?**
Python library for creating mathematical animations (3Blue1Brown style). PrepX uses it for animated conceptual diagrams in Astra Stream lectures.

### 7.1 Install Manim

```bash
# Install system dependencies
apt install -y libcairo2-dev libpango1.0-dev libffi-dev

# Install Manim via pip
pip3 install manim

# Verify
manim --version
```

### 7.2 Install LaTeX (Required for Math Rendering)

```bash
# Install TeX Live (large download ~4GB, required for math formulas)
apt install -y texlive-full

# Or minimal install:
apt install -y texlive-latex-extra texlive-fonts-recommended
```

### 7.3 Test Manim

```bash
# Create test animation
manim -pqh -o test CircleToSquare

# Should generate: media/videos/test/1080p60/CircleToSquare.mp4
```

### 7.4 Astra Stream Manim Integration

`lib/astra-engine.ts` can trigger Manim animations:

```typescript
// When generating a lecture on "Bretton Woods System":
// 1. AI generates script text
// 2. For complex concepts, astra-engine triggers Manim
// 3. Manim renders animated diagram (e.g., gold standard flow)
// 4. Video saved to public/videos/
// 5. URL stored in `astra_scripts` table
```

**MVP:** Manim renders diagrams as static images (no full animation needed)
**P2:** Full animated sequence rendered via Remotion + Manim pipeline

---

## 8. ComfyUI + LTX2.3 Setup (AI Video Frames)

**What is this?**
ComfyUI generates AI video frames from text prompts. LTX2.3 (Lightricks) is a text-to-video model. PrepX uses this to generate visual content for Astra Stream lectures.

### 8.1 Install ComfyUI

```bash
# Create directory
mkdir -p /opt/comfyui && cd /opt/comfyui

# Clone ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git .

# Create Python environment
python3 -m venv venv
source venv/bin/activate

# Install PyTorch with CUDA (for GPU)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# OR CPU-only (no GPU):
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install ComfyUI requirements
pip install -r requirements.txt
```

### 8.2 Install LTX2.3 (Lightricks Video Model)

```bash
# Install LTX-Video custom node
pip install git+https://github.com/Lightricks/ComfyUI-LTXVideo.git

# Download LTX2.3 model checkpoint (requires HuggingFace account)
mkdir -p models/checkpoints
cd models/checkpoints

# Option 1: Download via HuggingFace CLI
pip install huggingface-hub
huggingface-cli download Lightricks/LTX-Video ltx-video-2b-v0.9.5.safetensors

# Option 2: Manual download
wget https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-video-2b-v0.9.5.safetensors

cd /opt/comfyui
```

### 8.3 Start ComfyUI Server

```bash
# With CORS enabled (for PrepX to call from different domain)
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header "*"

# For production (background):
nohup python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header "*" > comfyui.log 2>&1 &

# Verify: Open http://your-server-ip:8188 in browser
```

### 8.4 GPU Configuration (If Available)

```bash
# For NVIDIA GPU, start with CUDA:
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header "*" --cuda-device 0

# Check GPU usage:
nvidia-smi
```

### 8.5 ComfyUI API Test

```bash
# Test ComfyUI API endpoint
curl -X POST http://localhost:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": {
      "3": {"inputs": {"text": "A diagram of the Indian Parliament building", "clip": ["4", 1]}, "class_type": "CLIPTextEncode"},
      "4": {"inputs": {"ckpt_name": "ltx-video-2b-v0.9.5.safetensors"}, "class_type": "CheckpointLoaderSimple"}
    }
  }'
```

---

## 9. Astra Stream Watch Mode Pipeline

**What is Watch Mode?**
The complete video generation pipeline for Astra Stream lectures.

### 9.1 Pipeline Flow

```
User selects topic (e.g., "Bretton Woods System")
    ↓
lib/astra-engine.ts generates script text (via AI Router)
    ↓
For each slide in script:
    ├─ ComfyUI generates visual frame (text prompt → image/video)
    ├─ Manim renders animated diagram (if concept needs visualization)
    └─ Remotion sequences all frames with timing
    ↓
Final video assembled and stored in Supabase Storage
    ↓
User clicks PLAY on /astra page → watches full AI-generated lecture
```

### 9.2 Watch Mode Configuration

In `.env.local`:

```bash
# ComfyUI connection
COMFYUI_BASE_URL=http://your-comfyui-server:8188
COMFYUI_ENABLED=true

# Remotion output directory
REMOTION_OUTPUT_DIR=public/videos

# Manim output directory
MANIM_OUTPUT_DIR=public/diagrams
```

### 9.3 Trigger Watch Mode (Admin)

```bash
# 1. Admin visits /admin/content or /astra
# 2. Click "Generate Video Lecture" on a topic
# 3. Backend pipeline triggers:
#    - AI generates script
#    - ComfyUI generates frames
#    - Remotion sequences frames
#    - Result saved to `astra_scripts` table

# Or via API:
curl -X POST http://localhost:3000/api/astra/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "Bretton Woods System", "subject": "economy", "language": "en"}'
```

---

## 10. Coolify Deployment

### 10.1 Install Coolify

```bash
# One-liner install
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Access dashboard:
# https://your-server-ip:8000
```

### 10.2 Add PrepX Resource

1. **Coolify Dashboard** → Projects → Add `prepx`
2. **Create Resource** → Application
3. Source: **GitHub** → `varuniclinic07-creator/PrepX`
4. Branch: `main` | Build Pack: **Docker**
5. Base Directory: `/`

### 10.3 Configure Build

Coolify auto-detects `Dockerfile`. The multi-stage build:
- **Stage 1**: Install deps (`npm ci`)
- **Stage 2**: Build (`next build` with standalone output)
- **Stage 3**: Run (`node server.js`)

### 10.4 Configure Services (Docker Compose for Coolify)

In Coolify, add these **Services** alongside your app:

| Service | Image | Purpose |
|---------|-------|---------|
| PostgreSQL | `postgres:16-alpine` | Main database |
| Redis | `redis:7-alpine` | Cache + leaderboard |
| MinIO | `minio/minio` | File storage (optional) |

Or use the provided `docker-compose.yml`:
```bash
docker compose up -d
```

### 10.5 Set Environment Variables

In Coolify → Resource → **Environment Variables**, add ALL variables from Section 11.

**Mark sensitive ones as "Is Secret":**
- All `*_API_KEY` variables
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `ADMIN_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 10.6 Domain + SSL

1. **Domains** → Add `prepx.yourdomain.com`
2. Enable **SSL** (Let's Encrypt auto)
3. Enable **Force HTTPS**

### 10.7 Deploy

Click **Deploy** → First build: 3-5 minutes.

### 10.8 CI/CD Auto-Deploy

```bash
# In Coolify → Webhooks → copy URL
# GitHub repo → Settings → Webhooks → Add
# Payload URL: https://coolify.yourdomain.com/webhooks/github
# Events: Push
```

---

## 11. Complete Environment Variables

Copy this to `.env.local` and fill in real values:

```bash
# ============================================================================
# REQUIRED — Supabase (Database + Auth)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL_HERE
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE

# ============================================================================
# RECOMMENDED — At least 2 AI providers for resilience
# ============================================================================

# Tier 1: Ollama (local, free)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=
OLLAMA_MODEL=llama3

# Tier 2: Groq (fast, cheap, primary)
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEYS=sk_groq_1,sk_groq_2,sk_groq_3,sk_groq_4,sk_groq_5,sk_groq_6,sk_groq_7
GROQ_MODEL=llama3-70b-8192

# Tier 3: 9router (custom)
NINEROUTER_BASE_URL=YOUR_NINEROUTER_BASE_URL
NINEROUTER_MODEL=claude-sonnet
NINEROUTER_API_KEY=sk_ninerouter_xxx

# Tier 4: NVIDIA
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama3-70b-instruct
NVIDIA_API_KEY=nvapi-xxx

# Tier 5: Kilo AI
KILO_BASE_URL=https://api.kilo.ai/v1
KILO_API_KEYS=sk_kilo_1,sk_kilo_2,sk_kilo_3,sk_kilo_4
KILO_MODEL=gpt-4o

# Tier 6: OpenAI (fallback)
OPENAI_API_KEY=sk-openai-xxx

# ============================================================================
# REQUIRED — Razorpay (Payments)
# ============================================================================
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=sk_razorpay_xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_WEBHOOK_SECRET=whsec_xxx

# ============================================================================
# OPTIONAL — Redis / Upstash (for Battle Royale leaderboard)
# ============================================================================
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# ============================================================================
# OPTIONAL — ComfyUI (for Astra Stream video generation)
# ============================================================================
COMFYUI_BASE_URL=http://localhost:8188
COMFYUI_ENABLED=false

# ============================================================================
# OPTIONAL — Remotion (video rendering output)
# ============================================================================
REMOTION_OUTPUT_DIR=public/videos

# ============================================================================
# OPTIONAL — Manim (animated diagrams output)
# ============================================================================
MANIM_OUTPUT_DIR=public/diagrams

# ============================================================================
# INTERNAL — Admin
# ============================================================================
ADMIN_API_KEY=admin_secret_here
```

---

## 12. Verification Checklist

After deployment, verify each component:

```bash
# 1. PrepX App
curl https://prepx.yourdomain.com/api/health
# Expected: {"ok": true, "service": "PrepX"}

# 2. AI Router
curl -X POST https://prepx.yourdomain.com/api/test-ai \
  -H "Content-Type: application/json"
# Expected: {"ok": true, "message": "..."}

# 3. Supabase Connection
# Login to app → take quiz → verify results persist

# 4. Razorpay Test
# Visit /pricing → click Premium → complete test payment

# 5. ComfyUI (if enabled)
curl http://your-comfyui-server:8188/system_stats
# Expected: JSON with GPU/CPU info

# 6. TypeScript Build
npx tsc --noEmit
# Expected: No errors

# 7. All Pages Load
# / (dashboard), /topic/1, /quiz/1, /profile, /astra, /rank
```

---

## 13. Troubleshooting

| Issue | Solution |
|-------|----------|
| `npx tsc --noEmit` fails | Check `tsconfig.json` include paths; verify all dependencies installed (`npm ci`) |
| Remotion rendering fails | Install Chromium: `apt install chromium-browser` or `npx puppeteer browsers install chrome` |
| Manim "LaTeX not found" | Install `texlive-full` or `texlive-latex-extra` |
| ComfyUI "CUDA out of memory" | Reduce batch size; use CPU mode; upgrade GPU VRAM |
| ComfyUI CORS error | Start with `--enable-cors-header "*"` |
| Coolify build hangs | Increase build memory: `"buildArgs": {"NODE_OPTIONS": "--max-old-space-size=4096"}` |
| Razorpay webhook fails | Verify `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard |
| AI router returns "All providers failed" | Check at least one provider API key has credits; verify keys aren't expired |
| Supabase RLS blocks reads | Run `supabase/schema.sql` to ensure RLS policies exist |
| Battle Royale leaderboard empty | Verify Redis connection (`UPSTASH_REDIS_REST_URL`) |
| Astra Stream shows no video | Check `COMFYUI_ENABLED` is `true`; verify ComfyUI running on port 8188 |

---

## Quick Reference Commands

```bash
# Full stack startup (local dev)
docker compose up -d

# View logs
docker compose logs -f prepx
docker compose logs -f comfyui

# Restart app
docker compose restart prepx

# Rebuild after code changes
docker compose up -d --build prepx

# Access database
docker exec -it prepx-postgres psql -U prepx -d prepx

# Access ComfyUI logs
tail -f /opt/comfyui/comfyui.log
```

---

**Document Version:** 2.0 | **PrepX Version:** 1.0 | **Date:** 2026-04-26

---

## Dead Tables

The following tables exist in the schema but are currently unused by the application code:

- `activity_log` — Telemetry table; no active event logging in production code. Safe to archive pre-deployment.
- `agent_tasks` — Hermes agent queue table; `spawnAgent` references it but no task executor reads from it. Safe to drop if not implementing background agents.

### Pre-Deployment Instructions
1. Review whether `activity_log` is needed for analytics; if not, drop it.
2. If background agent task processing is not enabled, drop `agent_tasks`.
3. For any other dead tables identified via `\dt` but never queried in the codebase, drop or archive them before production deployment.
