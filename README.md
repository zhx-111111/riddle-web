# 🧙 Riddle Web — Tom Riddle's Diary for the Web

> *"Hello, Harry Potter. My name is Tom Riddle."*

A faithful web port of [MaximeRivest/Riddle](https://github.com/MaximeRivest/Riddle) — write with your finger or stylus, the page drinks your ink, and Tom Riddle writes back in a flowing hand.

## ✨ Features

- **Handwritten input** — Finger or stylus on any touchscreen device
- **Smooth ink** — Catmull-Rom → Cubic Bezier curves, pressure-mapped width, ink bleed effect
- **Tom Riddle persona** — Faithful to the original HP books (Chamber of Secrets Ch.13 & 17)
- **Multi-provider AI** — Agnes Intl + Agnes China + Zhipu AI (OpenAI-compatible)
- **Sentence-by-sentence streaming** — SSE streaming with intelligent sentence segmentation
- **Auto-fade** — Replies fade after 8 seconds, like ink being absorbed by the page
- **Fullscreen mode** — Distraction-free writing, only theme + fullscreen buttons visible
- **Cross-browser** — Chrome, Edge, Safari (iOS/macOS), Firefox
- **Admin panel** (`/admin`) — Tune all 28 params at runtime, no redeploy needed
- **KV-backed memory** — Conversation history persists 24h

## 🚀 Quick Deploy (Cloudflare Workers)

### Step 1: Fork & Connect

1. Fork this repo to your GitHub account
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Workers & Pages → Create
3. Connect Git → Select your fork → Framework preset: `None`

### Step 2: Set Secrets (5 required)

Dashboard → Settings → Variables → **Add Secret** (encrypted):

| Variable | Value | Required |
|---|---|---|
| `agnes_keys` | Your Agnes Intl API key(s), comma-separated | ✅ Recommended |
| `zhipu_keys` | Your Zhipu AI API key(s), comma-separated | ✅ Recommended (free) |
| `admin_password` | Your admin panel password | ✅ Required |
| `admin_token` | Any random string (session signing) | ✅ Required |
| `agnes_cn_keys` | Your Agnes China API key(s) | ⬜ Optional |

### Step 3: Bind KV

Dashboard → **Bindings** → Add → KV Namespace → Create new → name: `riddle-kv` → binding: `RIDDLE_KV`

### Step 4: Deploy

Dashboard → Deployments → **Retry deployment** → Wait for green ✅

## 🔑 Getting API Keys

| Provider | Sign up at | Free? |
|---|---|---|
| **Agnes Intl** | https://platform.agnes-ai.com | Credits on signup |
| **Agnes China** | https://platform.agnes-ai.cn | Credits on signup |
| **Zhipu AI** | https://open.bigmodel.cn | ✅ Free tier (GLM-4V-Flash) |

## ⚙️ Configuration

### Environment Variables (auto-preset in wrangler.toml)

These 8 vars appear automatically in your dashboard after first deploy:

| Variable | Default | Description |
|---|---|---|
| `agnesModel` | `agnes-2.5-flash` | Agnes Intl model |
| `agnesCnModel` | `agnes-2.5-flash` | Agnes China model |
| `zhipuModel` | `glm-4v-flash` | Zhipu model |
| `agnesBaseUrl` | `https://apihub.agnes-ai.com/v1` | Agnes Intl API URL |
| `agnesCnBaseUrl` | `https://apihub.agnes-ai.cn/v1` | Agnes China API URL |
| `zhipuBaseUrl` | `https://open.bigmodel.cn/api/paas/v4` | Zhipu API URL |
| `adminPassword` | _(empty)_ | Plaintext fallback (use Secret instead) |
| `adminToken` | `riddle-default-secret` | Plaintext fallback (use Secret instead) |

### All 28 Parameters

The remaining 20 params have hardcoded defaults in `src/worker/config.ts` and are
**fully editable at runtime via the `/admin` panel** — no redeploy needed:

| Group | Params |
|---|---|
| **Writing** | `idle_timeout_ms`, `min_dist_px`, `max_dist_px`, `pressure_min_px`, `pressure_max_px` |
| **Animation** | `poll_interval_ms`, `stroke_interval_ms`, `stroke_max_dur_ms`, `svg_stroke_width`, `max_lines`, `line_height_px`, `margin_top_px`, `margin_x_px`, `font_size_px` |
| **Lifecycle** | `reply_fade_delay_ms`, `fade_duration_ms`, `history_ttl_sec` |
| **Backend** | `max_history_turns`, `max_retries`, `request_timeout_ms`, `max_tokens`, `temperature` |

### Admin Panel

Visit `https://your-domain/admin` → Enter password → Tune everything live.

Changes save to KV and take effect immediately across all Worker instances.

## 📱 Usage

1. Open your deployed URL on any touchscreen device
2. Write a question with your finger or stylus
3. Wait 1.5 seconds after the last stroke
4. Watch your ink fade away... and Tom's reply write itself onto the page
5. After 8 seconds, the reply fades too — write again to continue the conversation

## 🏗️ Architecture

```
Browser
  │
  ├── /                     → Diary frontend (zero admin UI)
  ├── /api/chat             → AI conversation (public)
  ├── /api/setup            → Diagnostics (public)
  ├── /api/config           → Runtime config (public, read-only)
  │
  └── /admin                → Admin panel (password protected)
        ├── /admin/login           → Password page
        ├── /api/admin/login       → Verify password
        ├── /api/admin/config      → GET / PUT configuration
        └── /api/admin/reload     → Force reload all instances
```

## 📂 Project Structure

```
riddle-web/
├── wrangler.toml              ← Cloudflare config + 8 preset vars
├── package.json
├── tsconfig.json
├── README.md
├── DEPLOY.md
│
├── dist/                       ← Frontend (served as static assets)
│   ├── index.html             ← Diary page (zero admin entry)
│   ├── styles.css             ← 4 themes + responsive + fullscreen
│   └── app.js                ← Ink capture + bezier rendering + SSE
│
└── src/worker/                ← Backend (TypeScript, compiled by Wrangler)
    ├── index.ts               ← Worker entry + routing
    ├── types.ts               ← Env interface (dual naming) + VAR_DOCS
    ├── config.ts              ← All defaults + KV overrides + dual-name lookup
    ├── chat.ts                ← Multi-provider AI + SSE streaming + persona
    ├── admin.ts               ← /admin panel + auth + config CRUD
    ├── health.ts              ← /api/health
    └── init.ts                ← /api/init (session setup)
```

## 🔒 Security

- **Admin password** — SHA-256 hashed, stored as Cloudflare Secret
- **Session cookie** — HttpOnly + SameSite=Strict + 1-hour expiry
- **Brute-force protection** — 5 failed attempts → 5-minute lockout
- **Secret masking** — API keys shown as `sk-a••••••••w3f2` in admin UI
- **No admin entry in frontend** — `/admin` only accessible via direct URL

## 📜 License

MIT

## 🙏 Credits

- Original concept: [MaximeRivest/Riddle](https://github.com/MaximeRivest/Riddle) (reMarkable Paper Pro)
- Tom Riddle persona based on J.K. Rowling's *Harry Potter and the Chamber of Secrets*
- Built with Cloudflare Workers + Workers KV + OpenAI-compatible APIs
