# Riddle Web — Quick Deploy Guide

## 1. Push to GitHub

```bash
cd riddle-web
git add -A
git commit -m "v3.4: clean dashboard vars + CLI cleanup script + EN docs"
git push https://zhx-111111:YOUR_TOKEN@github.com/zhx-111111/riddle-web.git main
```

## 2. Cloudflare Dashboard (3 steps)

### A. Connect Git
Workers & Pages → Create → Connect Git → Select `riddle-web`

### B. Set 4-5 Secrets
Settings → Variables and Secrets → Add Secret:

```
agnes_keys      = your_agnes_intl_key
zhipu_keys      = your_zhipu_key
admin_password  = your_admin_password
admin_token     = any_random_string
agnes_cn_keys   = (optional) your_agnes_china_key
```

### C. Bind KV
Bindings → Add → KV Namespace → Create `riddle-kv` → Bind as `RIDDLE_KV`

## 3. ⚠️ CLEAN UP OLD VARS (critical!)

When you open **Settings → Variables** in the Cloudflare dashboard, you will likely see **18+ plaintext variables** left over from old deploys:
`idle_timeout_ms`, `min_dist_px`, `poll_interval_ms`, etc.

**These must be deleted.** They override the hardcoded defaults in `config.ts` and cause unpredictable behavior.

### Fastest method — Wrangler CLI:

```bash
# Install wrangler (one-time)
npm install -g wrangler && wrangler login

# Run the included cleanup script
bash clean-vars.sh
```

### Manual method — Dashboard:

1. Go to **Settings → Variables and Secrets**
2. In the **Vars section** (plaintext, NOT the Secrets section with the 🔒 icon)
3. Click the **red trash icon** next to each variable
4. Delete ALL of them — every single one
5. After cleanup: **Vars = 0 entries**, only Secrets remain

> **Why does this happen?** Old versions declared vars in `wrangler.toml`'s `[vars]` block. Wrangler wrote them to the dashboard. Removing `[vars]` from the file does NOT auto-delete them from the dashboard. Cloudflare keeps them forever until you manually remove them.

## 4. Deploy
Deployments → Retry deployment → wait for green ✅

## 5. Verify
- Open `https://your-domain.workers.dev` → should show diary UI (English)
- Open `https://your-domain.workers.dev/api/setup` → should show all `configured: true`
- Open `https://your-domain.workers.dev/admin` → login with your admin_password (Chinese UI)

## Troubleshooting

| Issue | Fix |
|---|---|
| "All Providers failed" | Check `/api/setup` — keys not loaded. Re-add Secrets. |
| Deploy fails with "10021" | Old `[vars]` in dashboard. Run `clean-vars.sh` or delete manually. |
| Admin panel shows empty values | Logged out. Cookies expired. Login again. |
| Ink looks jagged | Clear browser cache, hard reload. DPR capped at 3. |
| Fullscreen not working | Safari needs user gesture. Tap the button directly. |
| Variables keep reappearing | You re-added them, or an old `wrangler.toml` with `[vars]` got deployed. Check git history. |
