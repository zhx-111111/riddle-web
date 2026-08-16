// ════════════════════════════════════════════════════════
// admin.ts — /admin 管理后台（中文界面）
// ════════════════════════════════════════════════════════

import type { Env } from './types';
import { setKvOverride, clearKvOverrides, getAllKvOverrides } from './config';

// ─── Naming helpers ───
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// ─── KV helpers ───
const KV_PREFIX = 'admin:config:';

async function kvGetAll(kv: any): Promise<Record<string, string>> {
  try {
    const list = await kv.list({ prefix: KV_PREFIX });
    const result: Record<string, string> = {};
    for (const key of list.keys) {
      const val = await kv.get(key.name);
      if (val) {
        result[key.name.replace(KV_PREFIX, '')] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}

async function kvSet(kv: any, key: string, value: string): Promise<void> {
  await kv.put(KV_PREFIX + key, value);
}

async function kvDelete(kv: any, key: string): Promise<void> {
  await kv.delete(KV_PREFIX + key);
}

// ─── Auth helpers ───
function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':riddle-admin');
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

function makeSessionToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + ':' + Date.now() + ':' + Math.random());
  return crypto.subtle.digest('SHA-256', data).then(buf => {
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

// ════════════════════════════════════════════════════════
// 登录页面 HTML（中文）
// ════════════════════════════════════════════════════════
const LOGIN_HTML = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<title>日记管理后台 — 登录</title>',
  '<style>',
  '*{margin:0;padding:0;box-sizing:border-box}',
  'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}',
  '.login-box{background:#15151e;border:1px solid #2a2a3e;border-radius:12px;padding:40px 32px;width:100%;max-width:380px;text-align:center}',
  '.login-box h1{font-size:22px;margin-bottom:8px;color:#fff}',
  '.login-box p{font-size:13px;color:#888;margin-bottom:24px}',
  '.login-box input{width:100%;padding:12px 16px;border-radius:8px;border:1px solid #2a2a3e;background:#0f0f18;color:#fff;font-size:16px;margin-bottom:16px;outline:none;transition:border-color .2s}',
  '.login-box input:focus{border-color:#6366f1}',
  '.login-box button{width:100%;padding:12px;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}',
  '.login-box button:hover{opacity:.9}',
  '.login-box .error{color:#ef4444;font-size:13px;margin-top:12px;min-height:18px}',
  '.lockout{color:#f59e0b;font-size:13px;margin-top:12px}',
  '</style></head><body>',
  '<div class="login-box">',
  '<h1>🧙 日记管理后台</h1>',
  '<p>请输入管理员密码</p>',
  '<form id="loginForm" method="POST" action="/api/admin/login">',
  '<input type="password" name="password" id="pw" placeholder="管理员密码" autofocus autocomplete="off">',
  '<button type="submit">登 录</button>',
  '</form>',
  '<div class="error" id="err"></div>',
  '<div class="lockout" id="lockout"></div>',
  '</div>',
  '<script>',
  'const errEl=document.getElementById("err");',
  'const lockEl=document.getElementById("lockout");',
  'const form=document.getElementById("loginForm");',
  'const params=new URLSearchParams(location.search);',
  'if(params.get("error")==="invalid")errEl.textContent="密码错误，请重试";',
  'if(params.get("error")==="locked")lockEl.textContent="尝试次数过多，请5分钟后再试";',
  'if(params.get("error")==="expired")errEl.textContent="会话已过期，请重新登录";',
  'form.addEventListener("submit",async(e)=>{',
  '  e.preventDefault();',
  '  const pw=document.getElementById("pw").value;',
  '  if(!pw){errEl.textContent="请输入密码";return;}',
  '  const fd=new FormData();fd.set("password",pw);',
  '  try{',
  '    const res=await fetch("/api/admin/login",{method:"POST",body:fd,redirect:"manual"});',
  '    if(res.status===302||res.status===0){const loc=res.headers.get("Location")||"/admin";location.href=loc;}',
  '    else if(res.status===401){const d=await res.json().catch(()=>({}));errEl.textContent=d.message||"登录失败";}',
  '    else{location.href="/admin";}',
  '  }catch(e){form.submit();}',
  '});',
  '</' + 'script>',
  '</body></html>',
].join('\n');

// ════════════════════════════════════════════════════════
// 管理面板 HTML（中文）
// ════════════════════════════════════════════════════════
const ADMIN_HTML = [
  '<!DOCTYPE html>',
  '<html lang="zh-CN">',
  '<head>',
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<title>日记管理后台</title>',
  '<style>',
  '*{margin:0;padding:0;box-sizing:border-box}',
  ':root{--bg:#0a0a0f;--panel:#15151e;--border:#2a2a3e;--text:#e0e0e0;--muted:#888;--accent:#6366f1;--green:#10b981;--red:#ef4444;--yellow:#f59e0b}',
  'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:16px;max-width:800px;margin:0 auto}',
  'header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)}',
  'header h1{font-size:20px;color:#fff}header h1 span{color:var(--accent)}',
  '.header-actions{display:flex;gap:8px}',
  '.btn{padding:8px 14px;border-radius:6px;border:none;font-size:13px;cursor:pointer;font-weight:500;transition:opacity .2s}',
  '.btn-primary{background:var(--accent);color:#fff}',
  '.btn-primary:hover{opacity:.9}',
  '.btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}',
  '.btn-ghost:hover{color:var(--text)}',
  '.btn-danger{background:transparent;color:var(--red);border:1px solid var(--red)}',
  '.btn-danger:hover{background:rgba(239,68,68,.1)}',
  '.group{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px}',
  '.group h2{font-size:14px;color:var(--muted);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)}',
  '.field{margin-bottom:14px}',
  '.field:last-child{margin-bottom:0}',
  '.field label{display:block;font-size:13px;color:var(--muted);margin-bottom:4px}',
  '.field label .var-name{color:var(--accent);font-family:monospace;font-size:12px}',
  '.field label .default-val{color:#555;font-size:11px;margin-left:6px}',
  '.field input{width:100%;padding:10px 12px;border-radius:6px;border:1px solid var(--border);background:#0f0f18;color:var(--text);font-size:14px;font-family:monospace;outline:none;transition:border-color .2s}',
  '.field input:focus{border-color:var(--accent)}',
  '.field .desc{font-size:11px;color:#666;margin-top:3px;line-height:1.5}',
  '.status-bar{position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:12px;font-size:13px;z-index:100}',
  '.status-dot{width:8px;height:8px;border-radius:50%;background:var(--muted)}',
  '.status-dot.saving{background:var(--yellow)}',
  '.status-dot.saved{background:var(--green)}',
  '.status-dot.error{background:var(--red)}',
  '.status-bar .spacer{flex:1}',
  '.toggle-secret{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:4px}',
  '.toggle-secret:hover{color:var(--text)}',
  '.badge{display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600}',
  '.badge-secret{background:rgba(239,68,68,.15);color:var(--red)}',
  '.badge-kv{background:rgba(16,185,129,.15);color:var(--green)}',
  '.badge-default{background:rgba(136,136,136,.15);color:var(--muted)}',
  '@media(max-width:600px){body{padding:12px}.group{padding:14px}header h1{font-size:17px}}',
  '</style></head><body>',
  '<header>',
  '<h1><span>🧙 汤姆·里德尔的日记</span> · 管理后台</h1>',
  '<div class="header-actions">',
  '<button class="btn btn-ghost" id="reloadBtn" title="重载所有 Worker 实例">🔄 重载</button>',
  '<button class="btn btn-danger" id="logoutBtn">退出登录</button>',
  '</div></header>',
  '<div id="content">加载中…</div>',
  '<div class="status-bar">',
  '<div class="status-dot" id="statusDot"></div>',
  '<span id="statusText">就绪</span>',
  '<span class="spacer"></span>',
  '<button class="btn btn-primary" id="saveBtn">💾 保存修改</button>',
  '</div>',
  '<script>',
  'const GROUPS=[',
  '  {key:"secrets",label:"🔑 API 密钥（加密存储）",fields:[',
  '    {name:"agnes_keys",desc:"Agnes 国际站 API 密钥，多个用逗号分隔",secret:true},',
  '    {name:"agnes_cn_keys",desc:"Agnes 国内站 API 密钥，多个用逗号分隔（可选）",secret:true},',
  '    {name:"zhipu_keys",desc:"智谱 AI API 密钥，多个用逗号分隔（推荐免费兜底）",secret:true},',
  '    {name:"admin_password",desc:"管理后台登录密码（用于访问 /admin）",secret:true},',
  '    {name:"admin_token",desc:"会话签名密钥（任意随机字符串）",secret:true}',
  '  ]},',
  '  {key:"models",label:"🤖 模型与接口地址",fields:[',
  '    {name:"agnes_model",desc:"Agnes 国际站模型名称"},',
  '    {name:"agnes_cn_model",desc:"Agnes 国内站模型名称"},',
  '    {name:"zhipu_model",desc:"智谱模型名称"},',
  '    {name:"agnes_base_url",desc:"Agnes 国际站 API 地址"},',
  '    {name:"agnes_cn_base_url",desc:"Agnes 国内站 API 地址"},',
  '    {name:"zhipu_base_url",desc:"智谱 API 地址"}',
  '  ]},',
  '  {key:"timing",label:"⏱️ 时序参数",fields:[',
  '    {name:"idle_timeout_ms",desc:"停笔多久后发送请求（毫秒）",num:true},',
  '    {name:"poll_interval_ms",desc:"逐字显现间隔时间（毫秒）",num:true},',
  '    {name:"stroke_interval_ms",desc:"每笔动画持续时间（毫秒）",num:true},',
  '    {name:"stroke_max_dur_ms",desc:"单笔最大动画时长（毫秒）",num:true},',
  '    {name:"reply_fade_delay_ms",desc:"回复显示多久后开始消失（毫秒）",num:true},',
  '    {name:"fade_duration_ms",desc:"消散动画时长（毫秒）",num:true},',
  '    {name:"request_timeout_ms",desc:"单次 API 请求超时（毫秒）",num:true}',
  '  ]},',
  '  {key:"ink",label:"🖌️ 笔迹与显示",fields:[',
  '    {name:"pressure_min_px",desc:"最小笔迹宽度（像素）",num:true},',
  '    {name:"pressure_max_px",desc:"最大笔迹宽度（像素）",num:true},',
  '    {name:"min_dist_px",desc:"最小采样距离（像素）",num:true},',
  '    {name:"max_dist_px",desc:"最大插值距离（像素）",num:true},',
  '    {name:"svg_stroke_width",desc:"SVG 路径描边宽度（像素）",num:true},',
  '    {name:"line_height_px",desc:"行高（像素）",num:true},',
  '    {name:"margin_top_px",desc:"回复顶部边距（像素）",num:true},',
  '    {name:"margin_x_px",desc:"回复左侧边距（像素）",num:true},',
  '    {name:"font_size_px",desc:"基础字号（像素）",num:true}',
  '  ]},',
  '  {key:"memory",label:"🧠 记忆与后端",fields:[',
  '    {name:"max_history_turns",desc:"最大对话历史轮数",num:true},',
  '    {name:"max_retries",desc:"API 最大重试次数",num:true},',
  '    {name:"max_tokens",desc:"模型最大输出 token 数",num:true},',
  '    {name:"temperature",desc:"采样温度（0-2，越大越发散）",num:true},',
  '    {name:"history_ttl_sec",desc:"KV 记忆过期时间（秒）",num:true}',
  '  ]}',
  '];',
  'let configData={};',
  'let dirtyFields=new Set();',
  'async function loadConfig(){',
  '  const res=await fetch("/api/admin/config",{credentials:"include"});',
  '  if(res.status===401){location.href="/admin/login";return;}',
  '  configData=await res.json();',
  '  render();',
  '}',
  'function escapeHtml(s){return String(s).replace(/[&<>"\']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","\'":"&#39;"}[c]));}',
  'function setStatus(state,text){',
  '  const dot=document.getElementById("statusDot");',
  '  const txt=document.getElementById("statusText");',
  '  dot.className="status-dot "+state;txt.textContent=text;',
  '}',
  'function render(){',
  '  const root=document.getElementById("content");',
  '  let html="";',
  '  for(const group of GROUPS){',
  '    html+=\'<div class="group"><h2>\'+group.label+\'</h2>\';',
  '    for(const f of group.fields){',
  '      const entry=(configData.config&&configData.config[f.name])||{};',
  '      const val=entry.current||"";',
  '      const def=entry.default||"";',
  '      const source=entry.source||"default";',
  '      const badge=source==="kv"?"<span class=\\"badge badge-kv\\">已存</span>":source==="secret"?"<span class=\\"badge badge-secret\\">密钥</span>":"<span class=\\"badge badge-default\\">默认</span>";',
  '      const inputType=f.secret?"password":(f.num?"number":"text");',
  '      html+=\'<div class="field"><label>\'+badge+\' <code>\'+f.name+\'</code><span class="default-val">默认: \'+def+\'</span></label><input type="\'+inputType+\'" id="f_\'+f.name+\'" value="\'+escapeHtml(val)+\'" data-name="\'+f.name+\'" data-secret="\'+f.secret+\'" placeholder="\'+escapeHtml(def)+\'"><div class="desc">\'+f.desc+\'</div></div>\';',
  '    }',
  '    html+="</div>";',
  '  }',
  '  root.innerHTML=html;',
  '  root.querySelectorAll("input").forEach(input=>{',
  '    input.addEventListener("input",()=>{dirtyFields.add(input.dataset.name);setStatus("dirty","有未保存的修改…");});',
  '    input.addEventListener("dblclick",()=>{if(input.dataset.secret==="true")input.type=input.type==="password"?"text":"password";});',
  '  });',
  '}',
  'document.getElementById("saveBtn").addEventListener("click",async()=>{',
  '  const updates={};',
  '  dirtyFields.forEach(name=>{const el=document.getElementById("f_"+name);if(el)updates[name]=el.value;});',
  '  if(Object.keys(updates).length===0){setStatus("saved","没有需要保存的修改");return;}',
  '  setStatus("saving","保存中…");',
  '  try{',
  '    const res=await fetch("/api/admin/config",{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(updates)});',
  '    if(res.status===401){location.href="/admin/login";return;}',
  '    const data=await res.json();',
  '    if(data.success){setStatus("saved","✅ 已保存 "+data.saved+" 项，正在重载…");dirtyFields.clear();await loadConfig();setTimeout(()=>setStatus("saved","✅ 所有修改已生效"),1500);}',
  '    else{setStatus("error",data.message||"保存失败");}',
  '  }catch(e){setStatus("error","网络错误: "+e.message);}',
  '});',
  'document.getElementById("reloadBtn").addEventListener("click",async()=>{',
  '  setStatus("saving","正在重载所有实例…");',
  '  try{',
  '    const res=await fetch("/api/admin/reload",{method:"POST",credentials:"include"});',
  '    if(res.status===401){location.href="/admin/login";return;}',
  '    const data=await res.json();',
  '    setStatus("saved","✅ "+data.message||"重载完成");',
  '  }catch(e){setStatus("error","重载失败: "+e.message);}',
  '});',
  'document.getElementById("logoutBtn").addEventListener("click",async()=>{',
  '  await fetch("/api/admin/logout",{method:"POST",credentials:"include"});',
  '  location.href="/admin/login";',
  '});',
  'loadConfig();',
  '</' + 'script>',
  '</body></html>',
].join('\n');

// ════════════════════════════════════════════════════════
// 路由处理器
// ════════════════════════════════════════════════════════

// ── GET /admin/login ──
export function handleAdminLoginPage(): Response {
  return new Response(LOGIN_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ── POST /api/admin/login ──
export async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const formData = await request.formData().catch(() => null);
  const body = await request.json().catch(() => null);
  const password = (formData?.get('password') as string) || (body?.password as string) || '';

  const adminPw = env.adminPassword || '';
  if (!adminPw) {
    return jsonResponse({ message: '管理员密码未配置，请在 Cloudflare Secrets 中设置 admin_password' }, 500);
  }

  // 防暴力破解
  const failKey = 'admin:fail:' + getClientIp(request);
  let fails = 0;
  try { fails = parseInt(await env.RIDDLE_KV.get(failKey) || '0'); } catch {}

  if (fails >= 5) {
    return jsonResponse({ message: '尝试次数过多，请5分钟后再试' }, 401);
  }

  const inputHash = await hashPassword(password);
  const expectedHash = await hashPassword(adminPw);

  if (inputHash !== expectedHash) {
    fails++;
    await env.RIDDLE_KV.put(failKey, String(fails), { expirationTtl: 300 });
    return jsonResponse({ message: '密码错误' }, 401);
  }

  // 登录成功
  await env.RIDDLE_KV.delete(failKey);
  const token = await makeSessionToken(env.adminToken || 'riddle-default-secret');
  const cookieValue = 'riddle_admin=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600';

  return new Response(JSON.stringify({ success: true, redirect: '/admin' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieValue,
    },
  });
}

// ── POST /api/admin/logout ──
export function handleAdminLogout(): Response {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'riddle_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    },
  });
}

// ── GET /admin ──
export function handleAdminPage(request: Request, env: Env): Response {
  if (!isAdminAuthenticated(request, env)) {
    return Response.redirect(new URL('/admin/login', request.url), 302);
  }
  return new Response(ADMIN_HTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ── GET /api/admin/config ──
export async function handleAdminGetConfig(request: Request, env: Env): Promise<Response> {
  if (!isAdminAuthenticated(request, env)) {
    return jsonResponse({ message: '未授权访问' }, 401);
  }

  const kvConfig = await kvGetAll(env.RIDDLE_KV);

  const allVars = new Set<string>();
  const { VAR_DOCS } = await import('./types');
  for (const name of Object.keys(VAR_DOCS)) allVars.add(name);
  allVars.add('admin_password');
  allVars.add('admin_token');
  for (const k of Object.keys(kvConfig)) allVars.add(k);

  const result: Record<string, any> = {};
  for (const name of allVars) {
    const docs = (VAR_DOCS as Record<string, any>)[name];
    // Try snake_case first, then camelCase
    let fromEnv = (env as any)[name];
    if (fromEnv === undefined || fromEnv === '') {
      fromEnv = (env as any)[toCamel(name)];
    }
    const fromKv = kvConfig[name];

    let current, source;
    if (fromKv !== undefined) { current = fromKv; source = 'kv'; }
    else if (fromEnv !== undefined && fromEnv !== '') { current = fromEnv; source = 'env'; }
    else { current = docs?.default || ''; source = 'default'; }

    const isSecret = name.includes('keys') || name.includes('password') || name.includes('token');
    const displayValue = isSecret && current && current !== '' ? maskSecret(current) : current;

    result[name] = {
      current: displayValue,
      default: docs?.default || '',
      desc: docs?.desc || '',
      group: docs?.group || 'Other',
      source,
      isSecret,
    };
  }

  return jsonResponse({ status: 'ok', config: result });
}

// ── PUT /api/admin/config ──
export async function handleAdminPutConfig(request: Request, env: Env): Promise<Response> {
  if (!isAdminAuthenticated(request, env)) {
    return jsonResponse({ message: '未授权访问' }, 401);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonResponse({ message: '请求体格式错误' }, 400);
  }

  const { VAR_DOCS } = await import('./types');
  const allowedKeys = new Set(Object.keys(VAR_DOCS));
  allowedKeys.add('admin_password');
  allowedKeys.add('admin_token');

  const saved: string[] = [];
  const errors: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.has(key)) { errors.push(key + ': 不是合法的配置项'); continue; }
    if (typeof value !== 'string') { errors.push(key + ': 必须是字符串'); continue; }
    const trimmed = value.trim();
    if (trimmed === '') {
      await kvDelete(env.RIDDLE_KV, key);
      const overrides = getAllKvOverrides();
      delete overrides[key];
      saved.push(key + '(已清除)');
      continue;
    }
    await kvSet(env.RIDDLE_KV, key, trimmed);
    setKvOverride(key, trimmed);
    saved.push(key);
  }

  return jsonResponse({
    success: errors.length === 0,
    saved: saved.length,
    errors: errors.length > 0 ? errors : undefined,
    message: errors.length > 0
      ? '已保存 ' + saved.length + ' 项，' + errors.length + ' 项失败'
      : '成功保存 ' + saved.length + ' 项配置',
  });
}

// ── POST /api/admin/reload ──
export async function handleAdminReload(request: Request, env: Env): Promise<Response> {
  if (!isAdminAuthenticated(request, env)) {
    return jsonResponse({ message: '未授权访问' }, 401);
  }

  const kvConfig = await kvGetAll(env.RIDDLE_KV);
  clearKvOverrides();
  for (const [k, v] of Object.entries(kvConfig)) {
    setKvOverride(k, v);
  }

  return jsonResponse({
    success: true,
    message: '已从 KV 重载 ' + Object.keys(kvConfig).length + ' 项配置',
    vars: Object.keys(kvConfig),
  });
}

// ════════════════════════════════════════════════════════
// 辅助函数
// ════════════════════════════════════════════════════════

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function getClientIp(request: Request): string {
  const cfIp = request.headers.get('CF-Connecting-IP');
  if (cfIp) return cfIp;
  const forwarded = request.headers.get('X-Forwarded-For');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function isAdminAuthenticated(request: Request, env: Env): boolean {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/riddle_admin=([a-f0-9]+)/);
  if (!match) return false;
  return match[1].length === 64;
}

function maskSecret(value: string): string {
  if (value.length <= 8) return '•'.repeat(value.length);
  return value.substring(0, 4) + '•'.repeat(Math.max(0, value.length - 8)) + value.substring(value.length - 4);
}

// ─── 供 chat.ts 调用 ───
export function getMergedConfig(env: Env): Record<string, string> {
  const result: Record<string, string> = {};
  // Convert all env vars to snake_case keys
  for (const [k, v] of Object.entries(env as any)) {
    if (typeof v === 'string' && v !== '') {
      const snake = k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
      result[snake] = v;
    }
  }
  const overrides = getAllKvOverrides();
  for (const [k, v] of Object.entries(overrides)) {
    result[k] = v;
  }
  return result;
}
