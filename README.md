# Riddle Web — Tom Riddle's Diary

A faithful web port of [MaximeRivest/Riddle](https://github.com/MaximeRivest/Riddle) — write with your finger or stylus, pause 1.5s, and Tom Riddle writes back in flowing handwriting that fades away like ink into paper.

## ✨ Features

- **Handwriting Input** — Finger & stylus with pressure-sensitive stroke width
- **Silky Ink** — Catmull-Rom cubic Bézier + normal-offset variable-width fill, C1-continuous, zero jagged edges
- **AI Handwritten Replies** — Vision LLM reads your strokes, replies sentence-by-sentence with stroke-by-stroke animation
- **Auto-Fade** — Entire page dissolves 8s after reply completes
- **Fullscreen** — Writing area only + floating toolbar (theme + fullscreen toggle)
- **4 Themes** — Tom's Diary (dark) / Parchment / Midnight / Letter
- **Landscape** — Follows system orientation automatically, no manual button
- **Admin Panel `/admin`** — Visual config editor, changes take effect instantly without redeployment
- **Multi-Provider Failover** — Agnes Intl + Agnes China + Zhipu AI with automatic key rotation
- **Cross-Browser** — Chrome / Edge / Safari (iOS & macOS) / Firefox

## 🚀 Deploy to Cloudflare Workers

### Step 1: Push to GitHub

```bash
git clone https://github.com/zhx-111111/riddle-web.git
cd riddle-web
# push to your own fork or this repo directly
```

### Step 2: Cloudflare Dashboard Setup

1. Go to **dash.cloudflare.com** → **Workers & Pages** → **Create** → **Connect to Git**
2. Select this repo
3. Framework preset: **None** (Wrangler config is in `wrangler.toml`)

### Step 3: Add Secrets (5 required, that's it)

Go to **Settings → Variables and Secrets** → **Add Secret**:

| Secret Name | What to put |
|---|---|
| `agnes_keys` | Your Agnes Intl API key(s), comma-separated |
| `agnes_cn_keys` | Agnes China key(s), comma-separated **(optional)** |
| `zhipu_keys` | Zhipu AI key(s), comma-separated **(recommended, free fallback)** |
| `admin_password` | Password to access `/admin` panel |
| `admin_token` | Any random string for session signing |

### Step 4: Bind KV

**Settings → Bindings** → **Add** → **KV Namespace** → Create new → Name: `riddle-kv` → Variable name: `RIDDLE_KV`

### Step 5: Deploy

Go to **Deployments** → **Retry deployment** → Wait for green ✅

---

## ⚠️ IMPORTANT: Why Are There 18+ Variables in Your Dashboard?

### The Root Cause

Earlier versions declared all 28 parameters in `wrangler.toml`'s `[vars]` block. When Wrangler deployed, it **wrote those vars into your Cloudflare dashboard**. Later versions removed the `[vars]` block — but **Cloudflare never auto-deletes dashboard vars**. They just sit there.

### Why This Breaks Things

Those stale vars **override the hardcoded defaults** in `src/worker/config.ts`. If an old `idle_timeout_ms=3000` is sitting in your dashboard, it will override the code's `1500` default, even though the `[vars]` block is gone from `wrangler.toml`.

### How to Fix — Three Options

#### Option A: Wrangler CLI (fastest)

```bash
# Install wrangler
npm install -g wrangler
wrangler login

# Run the included cleanup script
bash clean-vars.sh
```

Or manually, one line per var:

```bash
wrangler vars delete idle_timeout_ms --script-name riddle-web --yes
wrangler vars delete min_dist_px --script-name riddle-web --yes
wrangler vars delete max_dist_px --script-name riddle-web --yes
wrangler vars delete pressure_min_px --script-name riddle-web --yes
wrangler vars delete pressure_max_px --script-name riddle-web --yes
wrangler vars delete poll_interval_ms --script-name riddle-web --yes
wrangler vars delete stroke_interval_ms --script-name riddle-web --yes
wrangler vars delete stroke_max_dur_ms --script-name riddle-web --yes
wrangler vars delete svg_stroke_width --script-name riddle-web --yes
wrangler vars delete max_lines --script-name riddle-web --yes
wrangler vars delete line_height_px --script-name riddle-web --yes
wrangler vars delete margin_top_px --script-name riddle-web --yes
wrangler vars delete margin_x_px --script-name riddle-web --yes
wrangler vars delete font_size_px --script-name riddle-web --yes
wrangler vars delete reply_fade_delay_ms --script-name riddle-web --yes
wrangler vars delete fade_duration_ms --script-name riddle-web --yes
wrangler vars delete history_ttl_sec --script-name riddle-web --yes
wrangler vars delete max_history_turns --script-name riddle-web --yes
wrangler vars delete max_retries --script-name riddle-web --yes
wrangler vars delete request_timeout_ms --script-name riddle-web --yes
wrangler vars delete max_tokens --script-name riddle-web --yes
wrangler vars delete temperature --script-name riddle-web --yes
wrangler vars delete agnes_base_url --script-name riddle-web --yes
wrangler vars delete agnes_cn_base_url --script-name riddle-web --yes
wrangler vars delete zhipu_base_url --script-name riddle-web --yes
wrangler vars delete agnes_model --script-name riddle-web --yes
wrangler vars delete agnes_cn_model --script-name riddle-web --yes
wrangler vars delete zhipu_model --script-name riddle-web --yes
```

Verify cleanup:

```bash
wrangler vars list --script-name riddle-web
# Should show: 0 vars (all parameters live in config.ts defaults)
```

#### Option B: Dashboard (manual)

1. Open **Cloudflare Dashboard → Workers & Pages → riddle-web → Settings → Variables and Secrets**
2. In the **"Vars" section** (plaintext, NOT Secrets), click the red trash icon next to each variable
3. Delete all of them — every single one
4. After deletion, Vars section should show **0 entries**

#### Option C: Ignore (not recommended)

If you don't delete them, the old values will silently override your code defaults. Your diary will still work, but timing/ink behavior may be unpredictable.

### What You Should See After Cleanup

| Section | Count | Contents |
|---|---|---|
| **Vars** (plaintext) | **0** | Empty — all defaults live in `config.ts` |
| **Secrets** (encrypted) | **5** | `agnes_keys`, `agnes_cn_keys`, `zhipu_keys`, `admin_password`, `admin_token` |

That's it. Clean and minimal.

---

## 🔧 Admin Panel Usage

Open `https://your-domain/admin` → Enter `admin_password` → All 28 params organized in 5 groups:

- **API Keys** — Provider keys (displayed as `sk-ab••••••cd`)
- **Models & URLs** — Model names and API endpoints
- **Timing** — Animation speed, timeouts, fade delays
- **Ink & Display** — Stroke width range, sampling distance, font size
- **Memory & Backend** — History turns, retry count, temperature

Edit any value → Click **💾 保存修改** → Takes effect instantly, no redeployment needed.

> The admin panel UI is in **Chinese** (管理后台). The frontend diary UI is **English only** — no admin入口 visible to users.

---

## 🏗️ Architecture

```
Browser (English UI, zero admin entry)
  ├── /              → Diary writing page
  ├── /api/config    → GET runtime config
  ├── /api/chat      → POST strokes PNG → SSE sentence stream
  ├── /api/setup     → GET diagnostics
  ├── /api/init      → POST create session
  ├── /api/health    → GET health check
  │
  └── /admin         → Admin panel (password-protected, Chinese UI)
        ├── GET  /admin/login      → Login page
        ├── POST /api/admin/login  → Verify password
        ├── GET  /api/admin/config → List all params
        ├── PUT  /api/admin/config → Update params (KV-persisted)
        └── POST /api/admin/reload → Force reload all instances
```

## 📝 Variable Naming Rules

- **All lowercase** (e.g. `agnes_keys` not `AGNES_KEYS`)
- **Multi-key separator: comma `,`** → `sk-abc123,sk-def456,sk-ghi789`
- **Hardcoded defaults** in `src/worker/config.ts` — overridable via `/admin` at runtime
- **KV overrides** (set via admin panel) take highest priority, then Secrets, then defaults

## 📄 License

MIT
