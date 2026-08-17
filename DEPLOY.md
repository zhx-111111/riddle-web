# Riddle Web — Deployment Guide

## Quick Deploy to Cloudflare Pages

### Prerequisites
- A Cloudflare account (free tier works)
- A GitHub repository with this code
- API keys from at least one provider (Agnes or Zhipu)

### Step 1: Connect GitHub to Cloudflare Pages
1. Go to **Cloudflare Dashboard → Workers & Pages → Create**
2. Choose **Pages** → **Connect to Git**
3. Select your `riddle-web` repo → **Begin Setup**

### Step 2: Build Settings
| Setting | Value |
|---|---|
| Framework preset | `None` |
| Build command | `npm install && node build-worker.js` |
| Build output directory | `dist` |
| Root directory | `/` |

> The `wrangler.toml` already configures `main = "dist-worker/bundle.js"` which is produced by the build step.

### Step 3: Environment Variables (Secrets — required)
Go to **Settings → Variables → Add Secret**:

| Variable | What to put |
|---|---|
| `agnes_keys` | Your Agnes Intl API key(s), comma-separated |
| `zhipu_keys` | Your Zhipu AI API key(s), comma-separated |
| `admin_password` | Password for `/admin` panel access |
| `admin_token` | Any random string (session signing) |
| `agnes_cn_keys` | (Optional) Agnes China API keys |

### Step 4: KV Binding
1. **Workers & Pages → KV** → Create namespace → name it `riddle-kv`
2. Copy the namespace ID
3. In your repo, update `wrangler.toml` → `[[kv_namespaces]]` → `id = "your-kv-id"`
4. Or in Dashboard → **Settings → Bindings** → Add → KV → `RIDDLE_KV`

### Step 5: Deploy
- Push to `main` branch → Cloudflare auto-deploys
- Or hit **Retry Deployment** manually

### Step 6: Verify
1. Open `https://your-domain.pages.dev` → should show the diary
2. Open `https://your-domain.pages.dev/api/setup` → should show `status: "ok"` and providers configured
3. Open `https://your-domain.pages.dev/admin` → login with your admin password

## Troubleshooting

### "Command failed with exit code 1: npm install && node build-worker.js"
- Check that `package.json` includes `esbuild` in devDependencies
- Check that `build-worker.js` exists in repo root
- Verify Node.js version ≥ 18 in Cloudflare build environment

### "The diary is thinking..." forever
- Check `/api/setup` — are providers showing `configured: true`?
- Check Secrets are set correctly (no extra spaces, correct format)
- Check Cloudflare Workers logs for errors

### Variables not appearing in Dashboard
- They are set in `wrangler.toml` under `[vars]` section
- After deploy, they appear in **Settings → Variables** (Vars section, not Secrets)
- You can also edit all 28 params via `/admin` panel at runtime

## Architecture

```
Browser
  ├── /                     → Diary frontend (public)
  ├── /api/chat             → AI chat (public, SSE stream)
  ├── /api/setup            → Diagnostic info (public)
  ├── /api/config           → Runtime config (public, read-only)
  └── /admin                → Admin panel (password protected)
        ├── /admin/login    → Password page
        ├── /api/admin/login → Auth endpoint
        ├── /api/admin/config → GET/PUT config
        └── /api/admin/reload → Force reload all instances
```

## File Structure

```
riddle-web/
├── src/worker/          ← TypeScript Worker source
│   ├── index.ts         ← Main entry, routes requests
│   ├── config.ts        ← All 28 params + env loading
│   ├── chat.ts          ← AI provider calls + SSE streaming
│   ├── admin.ts         ← /admin panel (HTML + API)
│   ├── health.ts        ← Health check
│   ├── init.ts          ← Client init data
│   └── types.ts         ← Env type definitions
├── dist/                ← Frontend (served as static assets)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── dist-worker/         ← Built Worker bundle (gitignored, built during deploy)
│   └── bundle.js
├── build-worker.js      ← esbuild script
├── wrangler.toml        ← Cloudflare config
├── tsconfig.json        ← TypeScript config
└── package.json         ← Dependencies + scripts
```
