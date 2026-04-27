# Deployment Guide

## 🐳 Local — Docker Desktop

### Dev mode (hot-reload)

```bash
docker compose up
```

- Frontend: http://localhost:5173
- Backend:  http://localhost:3000/api/health
- Postgres: localhost:5432 (boardgame / boardgame_pass)

Source files are mounted into the containers — code changes hot-reload automatically.

### Production-like mode (test the prod build locally)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- Frontend (nginx): http://localhost
  Frontend talks to backend through nginx's `/api` and `/socket.io` proxy — no CORS issues.

### Optional env vars

Create `.env` at the repo root to override defaults (picked up by `docker compose`):

```bash
JWT_SECRET=your-real-secret-here
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

---

## ☁️ Production — Free Tier Stack

| Component | Service | Free Tier |
|-----------|---------|-----------|
| Backend (NestJS + Socket.io) | **Render** Web Service | 750 hr/mo · sleeps after 15 min idle |
| Postgres | **Neon** | 0.5 GB · always-on |
| Frontend (React/Vite) | **Vercel** | unlimited bandwidth |

### Step 1 — Database (Neon)

1. Sign up at https://neon.tech
2. Create project (region: Singapore for low latency from Thailand)
3. Copy the **connection string** (looks like `postgresql://user:pass@ep-xxx.aws.neon.tech/dbname?sslmode=require`)

### Step 2 — Backend (Render)

1. Push this repo to GitHub
2. Sign up at https://render.com
3. Click **New → Blueprint** → connect your GitHub repo
   - Render auto-detects [`render.yaml`](./render.yaml) at the root
4. In the service's **Environment** tab, set:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste from Neon) |
   | `JWT_SECRET`   | run `openssl rand -base64 48` and paste |
   | `FRONTEND_URL` | `https://your-app.vercel.app` (set after step 3) |
   | `GEMINI_API_KEY` | (optional) |
   | `GROQ_API_KEY`   | (optional) |

5. Deploy. Backend URL will be `https://boardgame-backend.onrender.com` (or similar).

   Verify: `https://<your-backend>.onrender.com/api/health` → `{"status":"ok",...}`

> **Heads up — Render free tier sleeps**: After 15 min of no requests the service hibernates. The first request after sleep takes ~30s to wake up. Active games will be lost on sleep (state lives in memory). For always-on, upgrade to $7/mo or switch to **Koyeb** / **Railway** ($5 credit/mo).

### Step 3 — Frontend (Vercel)

1. Sign up at https://vercel.com
2. **Import Project** → pick the same GitHub repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
4. **Environment Variables**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL`    | `https://<your-backend>.onrender.com` |
   | `VITE_SOCKET_URL` | `https://<your-backend>.onrender.com` |

5. Deploy. Frontend URL will be `https://<project>.vercel.app`.
6. Go back to **Render → Environment** and update `FRONTEND_URL` to the Vercel URL, then redeploy backend.

---

## 🔍 Smoke Test Checklist

After deploy:

- [ ] `/api/health` returns `200 OK`
- [ ] Register a new account → JWT returned
- [ ] Login → token saved to localStorage
- [ ] Create a room → appears in lobby
- [ ] Open second browser → join the room → both see each other in player list
- [ ] Start a game → both clients receive `game:state_sync`
- [ ] Roll dice → state updates on both clients in real-time
- [ ] Check browser DevTools → Network → WS shows persistent socket connection (status 101)

If WS upgrades to polling and never reaches 101: check that `FRONTEND_URL` on backend matches the actual Vercel URL exactly (including `https://`, no trailing slash).

---

## ⚠️ Known limits of this setup

- **Single instance only** — Game state lives in memory (`Map<roomId, GameState>` in `MonopolyService`). If backend restarts (deploy, sleep wake-up, crash), all active games are lost. Players need to start a new game.
- **Multi-instance scaling not supported** — Would require Redis pub/sub adapter for Socket.io and externalized state. Free Render plan is single-instance, so this is fine for now.
- **`synchronize: true`** in dev — auto-creates DB schema. Disabled in production (`NODE_ENV=production`). For schema changes in prod, you'll need to run TypeORM migrations manually or temporarily flip the flag.
