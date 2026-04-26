# PrepX Deployment Guide

## 1. What is Coolify?

**Coolify** is a self-hosted PaaS that deploys Docker containers with zero-config SSL, databases, and CI/CD. Alternative to Vercel/Railway.

### Requirements
- **Server**: Ubuntu 22.04/24.04 with 2 vCPU, 4GB RAM minimum
- **Domain**: A domain pointing to your server IP (e.g., `prepx.yourdomain.com`)
- **Optional**: ComfyUI server (2 vGPU or GPU for LTX2.3 video generation)

---

## 2. Install Coolify on Your Server

```bash
# SSH into your server
ssh root@your-server-ip

# Install Coolify (official one-liner)
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# After install completes, open in browser:
# https://your-server-ip:8000
# Follow the wizard to create admin account.
```

---

## 3. Add External Services to Coolify

PrepX needs **Supabase** and optionally **ComfyUI**. You have two options:

### Option A: Managed Services (Recommended for Production)

| Service | Provider | Setup Steps |
|---------|----------|-------------|
| **Supabase** | supabase.com | Create project → copy `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Redis** | upstash.com | Create database → copy `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| **ComfyUI** | Self-hosted on GPU server | See Section 6 below |

### Option B: Self-Hosted on Coolify (Cheaper for MVP)

1. In Coolify dashboard → **Projects** → **Add Resource** → **Database**
2. Add **PostgreSQL 16** (for Supabase replacement)
3. Add **Redis 7** (for leaderboard caching)
4. Add **MinIO** (for file storage)

---

## 4. Deploy PrepX App on Coolify

### Step 4.1: Connect GitHub Repo
1. Coolify → **Projects** → Add new project `prepx`
2. **Create Resource** → **Application**
3. Source: **GitHub** → Select `varuniclinic07-creator/PrepX`
4. Branch: `main`
5. Build Pack: Select `Docker`
6. Base Directory: `/`

### Step 4.2: Copy the Dockerfile
PrepX already has a `Dockerfile` at repo root. Coolify auto-detects it. It builds as a **multi-stage** image:
- Stage 1: deps (cached `npm ci`)
- Stage 2: builder (runs `next build`)
- Stage 3: runner (minimal Node.js + standalone output)

### Step 4.3: Configure Environment Variables

In Coolify → Resource → **Environment Variables**, add ALL of these:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=your-secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_WEBHOOK_SECRET=whsec_your-secret

GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_API_KEYS=key1,key2,key3,key4,key5,key6,key7
GROQ_MODEL=llama3-70b

NINEROUTER_BASE_URL=https://router.example.com
NINEROUTER_API_KEY=router-key
NINEROUTER_MODEL=claude-sonnet

NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama3-70b
NVIDIA_API_KEY=nvidia-key

KILO_BASE_URL=https://api.kilo.ai/v1
KILO_API_KEYS=k1,k2,k3,k4
KILO_MODEL=gpt-4o

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=
OLLAMA_MODEL=llama3

OPENAI_API_KEY=sk-xxx
ADMIN_API_KEY=admin-secret-123

UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io  # optional
UPSTASH_REDIS_REST_TOKEN=your-token                    # optional
COMFYUI_BASE_URL=http://your-comfyui-server:8188       # for video gen
```

**Mark all sensitive keys as "Is Secret" in Coolify.**

### Step 4.4: Health Check Configuration

In Coolify → Resource → **Healthcheck**:
- Path: `/api/health` (or any valid route)
- Interval: 30s
- Timeout: 10s

### Step 4.5: Domain & SSL

1. Coolify → Resource → **Domains**
2. Add: `prepx.yourdomain.com`
3. Enable **SSL** → Coolify auto-provisions Let's Encrypt
4. Enable **Force HTTPS Redirect**

### Step 4.6: Deploy

Click **Deploy** in Coolify. First build takes 3-5 minutes (installs packages + builds Next.js).

---

## 5. Database Setup (Supabase)

If using **managed Supabase** (recommended):

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → **New Query**
3. Paste contents of `supabase/schema.sql` from the repo
4. Run
5. Paste `supabase/seed.sql` for initial topics/quizzes
6. Go to **Database** → **Extensions** → enable `pgvector`

---

## 6. ComfyUI + LTX2.3 Video Generation Setup

PrepX's **Astra Stream** feature supports AI video lecture generation via **ComfyUI** running **LTX2.3**.

### 6.1 What is ComfyUI?
ComfyUI is a node-based Stable Diffusion inference engine. PrepX uses it as a backend service to generate visuals for Astra Stream.

### 6.2 Install ComfyUI on a GPU Server

```bash
# 1. Requirements: Ubuntu 22.04, NVIDIA GPU with 12GB+ VRAM, CUDA 12.1+
# 2. Install ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 3. Create Python environment
python -m venv venv
source venv/bin/activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt

# 4. Install LTX2.3 custom node
pip install git+https://github.com/Lightricks/ComfyUI-LTXVideo.git

# 5. Download LTX2.3 model checkpoint
# Place in: models/checkpoints/
# Download from: https://huggingface.co/Lightricks/LTX-Video

# 6. Start ComfyUI server & expose API
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header *
```

### 6.3 Connect PrepX to ComfyUI

In Coolify → PrepX → Environment Variables, add:

```text
COMFYUI_BASE_URL=http://your-comfyui-server-ip:8188
COMFYUI_ENABLED=true
```

(If ComfyUI runs on the same server as Coolify, use `http://localhost:8188`)

### 6.4 PrepX Astra Stream "Watch Mode"

The Astra Stream feature generates 3D video lectures. When ComfyUI is connected, PrepX auto-generates animations for lecture visuals.

When `COMFYUI_ENABLED` is set:
1. User selects a topic in `/astra`
2. PrepX generates the lecture script via `lib/astra-engine.ts` (AI)
3. App calls ComfyUI API with text prompts for each slide's visual
4. ComfyUI returns generated images/animations
5. PrepX sequences them into a timed lecture via Remotion (future) or image slideshow (MVP)

**This is the 'watch mode' — aspirants can watch AI-generated visual lectures.**

### 6.5 API Flow

```
PrepX App → POST /api/astra/generate
→ aiChat() generates lecture script
→ For each slide → POST ComfyUI /prompt
→ ComfyUI returns image/video
→ PrepX stores CDN URLs in `astra_scripts` table
→ User sees sequenced visuals in /astra playback
```

---

## 7. CI/CD: Auto-Deploy on Git Push

### GitHub Webhook Integration

1. Coolify → Resource → **Webhooks**
2. Copy the **Deploy Webhook URL**
3. GitHub repo → **Settings** → **Webhooks** → **Add webhook**
4. Payload URL: `https://coolify.yourdomain.com/webhooks/github`
5. Content type: `application/json`
6. Events: **Just the push event**

Now every `git push origin main` auto-triggeres a new Coolify build.

---

## 8. Monitoring & Logging

| Tool | How to Access |
|------|--------------|
| Coolify Logs | Dashboard → Resource → **Logs** (real-time) |
| Supabase Logs | supabase.com → Project → **Logs** |
| Razorpay Dashboard | dashboard.razorpay.com → Webhooks |
| ComfyUI Progress | http://comfyui-server-ip:8188 (web UI) |

---

## 9. Complete Verification Checklist

After deployment:

- [ ] App loads at `https://prepx.yourdomain.com`
- [ ] Onboarding flow works
- [ ] Quiz system generates and scores
- [ ] AI Router responds (test at `/api/test-ai`)
- [ ] Razorpay payments work in **test mode**
- [ ] Supabase data persists (create user, take quiz)
- [ ] ComfyUI accessible (visit `:8188` on GPU server)
- [ ] Astra Stream generates lecture script (admin trigger)
- [ ] Build passes: `npx tsc --noEmit`

---

## Quick Reference: Useful Coolify Commands

```bash
# SSH to server and debug
docker ps                    # List running containers
docker logs -f prepx-xxx     # Tail app logs
docker exec -it prepx-xxx sh  # Shell into container

# Restart app
# Just re-deploy from Coolify dashboard or push to GitHub
```

---

*Generated by BMAD for PrepX v1.0 | Date: 2026-04-26*
