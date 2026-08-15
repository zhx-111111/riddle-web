// ══════════════════════════════════════════════════════════
// init.ts — Session initialization
// ══════════════════════════════════════════════════════════

import type { Env, SessionData } from './types';

// GET /api/init — Create or refresh session, set Cookie
export async function handleInit(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const existingSid = getCookie(request, 'riddle_sid');

  let sid = existingSid;
  let session: SessionData | null = null;

  if (sid) {
    const raw = await env.RIDDLE_KV.get(`session:${sid}`);
    if (raw) {
      try { session = JSON.parse(raw); } catch {}
    }
  }

  if (!session) {
    sid = crypto.randomUUID();
    session = {
      sid,
      createdAt: Date.now(),
      messageCount: 0,
    };
    await env.RIDDLE_KV.put(`session:${sid}`, JSON.stringify(session), {
      expirationTtl: env.historyTtlSec || 86400,
    });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Tom Riddle's Diary</title>
<style>
* { margin:0; padding:0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: #e8e8e8;
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.container {
  max-width: 600px; background: rgba(255,255,255,0.05);
  border-radius: 16px; padding: 40px;
  backdrop-filter: blur(10px); border:1px solid rgba(255,255,255,0.1);
}
h1 { font-size: 1.8em; margin-bottom: 10px; color: #d4a574; }
.status { margin: 20px 0; }
.item { display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.1); }
.item:last-child { border-bottom: none; }
.label { color: #aaa; }
.value { font-weight: 600; }
.ok { color: #4ade80; }
.warn { color: #fbbf24; }
.err { color: #f87171; }
.tip { margin-top:25px; padding:15px; background:rgba(212,165,116,0.1); border-radius:8px; font-size:0.9em; line-height:1.6; color:#ccc; }
a { color:#d4a574; text-decoration:none; }
a:hover { text-decoration:underline; }
code { background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; }
</style></head>
<body>
<div class="container">
  <h1>🧙 Tom Riddle's Diary</h1>
  <p>Session ID: <code>${sid}</code></p>
  <div class="status" id="status">Checking…</div>
  <div class="tip">
    <strong>Deployment Tips:</strong><br>
    1. Fork this repo on GitHub<br>
    2. Connect to Cloudflare Workers & Pages<br>
    3. Set Secrets (lowercase names):<br>
    &nbsp;&nbsp;• <code>agnes_keys</code> — Agnes Intl API key(s)<br>
    &nbsp;&nbsp;• <code>agnes_cn_keys</code> — Agnes China key(s, optional)<br>
    &nbsp;&nbsp;• <code>zhipu_keys</code> — Zhipu AI key(s)<br>
    &nbsp;&nbsp;• <code>admin_password</code> — Admin panel password<br>
    &nbsp;&nbsp;• <code>admin_token</code> — Session signing secret<br>
    4. Bind KV namespace as <code>RIDDLE_KV</code><br>
    5. Redeploy
  </div>
</div>
<script>
fetch('/api/setup').then(r=>r.json()).then(data=>{
  const el = document.getElementById('status');
  let html = '';
  for (const [name, info] of Object.entries(data.providers||{})) {
    const ok = info.configured;
    html += '<div class="item"><span class="label">'+name+'</span><span class="value '+(ok?'ok':'err')+'">'+(ok?'✅ Configured':'❌ No Key')+'</span></div>';
  }
  const kv = data.kv && data.kv.configured;
  html += '<div class="item"><span class="label">KV Memory</span><span class="value '+(kv?'ok':'warn')+'">'+(kv?'✅ Connected':'⚠️ Not bound')+'</span></div>';
  el.innerHTML = html;
}).catch(err=>{
  document.getElementById('status').innerHTML = '<div class="item"><span class="label">Error</span><span class="value err">'+err.message+'</span></div>';
});
</script>
</body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': `riddle_sid=${sid}; Path=/; Max-Age=${env.historyTtlSec || 86400}; SameSite=Lax`,
    },
  });
}

function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(';')) {
    const [k, v] = cookie.trim().split('=');
    if (k === name) return v;
  }
  return null;
}
