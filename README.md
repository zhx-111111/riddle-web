# 🧙 Tom Riddle's Diary — Web Edition

> *"Hello, Harry Potter. My name is Tom Riddle. How did you come by my diary?"*

A faithful web port of [MaximeRivest/Riddle](https://github.com/MaximeRivest/Riddle) — write on the page with your finger or stylus, pause 1.5 seconds, and watch Tom Riddle write back stroke by stroke in his own hand.

## ✨ Features

- **Real ink** — Catmull-Rom splines with pressure-sensitive variable-width strokes
- **Smooth writing** — 120Hz adaptive sampling, zero jagged edges
- **Tom Riddle persona** — Faithful to the original novels (Books 2 & 6)
- **Multi-provider AI** — Agnes (Intl + China) & Zhipu, with automatic failover
- **Self-fading replies** — Ink dissolves into the page after 8 seconds
- **Fullscreen + Landscape** — Immersive writing experience
- **Admin panel** (`/admin`) — Edit all 28 parameters live, no redeploy needed
- **Cross-browser** — Chrome, Safari (iOS/macOS), Firefox, Edge

## 🚀 Quick Deploy

See [DEPLOY.md](./DEPLOY.md) for full instructions.

## 📝 Writing

1. Open the page
2. Write with your finger or stylus
3. Pause 1.5 seconds
4. Watch the diary drink your ink
5. Tom's reply writes itself stroke by stroke
6. After 8 seconds, the page clears itself

## 🔧 Configuration

All 28 parameters are editable at runtime via `/admin` (password protected):

| Category | Params |
|---|---|
| API Keys | `agnes_keys`, `agnes_cn_keys`, `zhipu_keys` |
| Models | `agnes_model`, `zhipu_model`, base URLs |
| Timing | `idle_timeout_ms`, `poll_interval_ms`, `stroke_interval_ms` |
| Ink | `pressure_min_px`, `pressure_max_px`, `min_dist_px` |
| Lifecycle | `reply_fade_delay_ms`, `fade_duration_ms`, `max_history_turns` |

## 📄 License

MIT
