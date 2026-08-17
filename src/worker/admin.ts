// ═══════════════════════════════════════════════════════
// admin.ts — /admin 管理后台 (Apple-style UI)
// ═══════════════════════════════════════════════════════

import type { Env } from './types';
import { VAR_DOCS } from './types';
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
      if (val) result[key.name.replace(KV_PREFIX, '')] = val;
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

// ═══════════════════════════════════════════════════════
// 登录页面 (Apple 风格)
// ═══════════════════════════════════════════════════════
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Tom Riddle's Diary — Admin</title>
<style>
  :root {
    --bg: #000000;
    --surface: rgba(28,28,30,0.85);
    --surface-hover: rgba(40,40,45,0.9);
    --border: rgba(255,255,255,0.08);
    --text: #f5f5f7;
    --text-secondary: #a1a1a6;
    --accent: #0a84ff;
    --accent-hover: #409cff;
    --danger: #ff453a;
    --warning: #ff9f0a;
    --success: #30d158;
    --danger-bg: rgba(255,69,58,0.12);
    --danger-border: rgba(255,69,58,0.3);
    --font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{
    font-family:var(--font);
    background:var(--bg);
    color:var(--text);
    min-height:100vh;
    display:flex;align-items:center;justify-content:center;
    padding:20px;
    -webkit-font-smoothing:antialiased;
    overflow:hidden;
  }
  /* Animated background */
  body::before{
    content:'';position:fixed;top:-50%;left:-50%;width:200%;height:200%;
    background:radial-gradient(ellipse at 30% 20%,rgba(10,132,255,0.08) 0%,transparent 50%),
               radial-gradient(ellipse at 70% 80%,rgba(120,80,255,0.06) 0%,transparent 50%);
    animation:drift 20s ease-in-out infinite alternate;z-index:0;
  }
  @keyframes drift{0%{transform:translate(0,0)}100%{transform:translate(-3%,2%)}}
  .login-container{
    position:relative;z-index:1;
    width:100%;max-width:400px;
    background:var(--surface);
    backdrop-filter:blur(40px) saturate(180%);
    -webkit-backdrop-filter:blur(40px) saturate(180%);
    border:1px solid var(--border);
    border-radius:20px;
    padding:48px 36px 36px;
    text-align:center;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
    animation:fadeUp .6s cubic-bezier(0.16,1,0.3,1);
  }
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
  .login-icon{
    width:64px;height:64px;border-radius:16px;
    background:linear-gradient(135deg,#1c1c2e,#0d0d1a);
    display:flex;align-items:center;justify-content:center;
    margin:0 auto 20px;
    border:1px solid rgba(255,255,255,0.06);
  }
  .login-icon svg{width:32px;height:32px}
  .login-container h1{
    font-size:24px;font-weight:700;
    letter-spacing:-0.5px;margin-bottom:6px;
  }
  .login-container .subtitle{
    font-size:14px;color:var(--text-secondary);
    margin-bottom:32px;line-height:1.5;
  }
  .input-group{margin-bottom:14px;text-align:left}
  .input-group label{
    display:block;font-size:12px;font-weight:500;
    color:var(--text-secondary);margin-bottom:6px;
    padding-left:4px;
  }
  .input-group input{
    width:100%;padding:14px 16px;
    background:rgba(0,0,0,0.3);
    border:1px solid var(--border);
    border-radius:12px;
    color:var(--text);font-size:16px;
    font-family:var(--font);
    outline:none;
    transition:border-color .25s,box-shadow .25s,background .25s;
  }
  .input-group input:focus{
    border-color:var(--accent);
    box-shadow:0 0 0 3px rgba(10,132,255,0.15);
    background:rgba(0,0,0,0.5);
  }
  .input-group input::placeholder{color:#555}
  .btn-primary{
    width:100%;padding:14px;
    border:none;border-radius:12px;
    background:var(--accent);color:#fff;
    font-size:16px;font-weight:600;
    font-family:var(--font);
    cursor:pointer;
    transition:background .2s,transform .1s;
    margin-top:8px;
  }
  .btn-primary:hover{background:var(--accent-hover)}
  .btn-primary:active{transform:scale(0.98)}
  .btn-primary:disabled{opacity:0.5;cursor:not-allowed}
  .error-box{
    margin-top:16px;padding:10px 14px;
    background:var(--danger-bg);
    border:1px solid var(--danger-border);
    border-radius:10px;
    color:var(--danger);font-size:13px;
    display:none;animation:shake .4s;
  }
  .error-box.show{display:block}
  @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  .lockout-box{
    margin-top:12px;padding:10px 14px;
    background:rgba(255,159,10,0.1);
    border:1px solid rgba(255,159,10,0.25);
    border-radius:10px;
    color:var(--warning);font-size:13px;
    display:none;
  }
  .lockout-box.show{display:block}
  .footer-hint{
    margin-top:28px;font-size:11px;
    color:#444;text-align:center;
  }
</style></head><body>
<div class="login-container">
  <div class="login-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="1.5">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke-linejoin="round"/>
      <path d="M12 22V12M12 12L3 7M12 12l9-5" stroke-linejoin="round"/>
    </svg>
  </div>
  <h1>管理员验证</h1>
  <p class="subtitle">Tom Riddle's Diary<br>请输入管理密码以继续</p>
  <form id="loginForm" novalidate>
    <div class="input-group">
      <label for="pw">管理密码</label>
      <input type="password" id="pw" placeholder="Enter admin password" autofocus autocomplete="off" spellcheck="false">
    </div>
    <button type="submit" class="btn-primary" id="submitBtn">登 录</button>
  </form>
  <div class="error-box" id="err"></div>
  <div class="lockout-box" id="lockout"></div>
  <p class="footer-hint">🔒 会话加密 · SHA-256 认证</p>
</div>
<script>
const errEl=document.getElementById("err");
const lockEl=document.getElementById("lockout");
const form=document.getElementById("loginForm");
const submitBtn=document.getElementById("submitBtn");
const params=new URLSearchParams(location.search);
function showError(msg){errEl.textContent=msg;errEl.classList.add("show");lockEl.classList.remove("show");}
function showLock(msg){lockEl.textContent=msg;lockEl.classList.add("show");errEl.classList.remove("show");}
if(params.get("error")==="invalid")showError("密码错误，请重试");
if(params.get("error")==="locked")showLock("尝试次数过多，请 5 分钟后再试");
if(params.get("error")==="expired")showError("会话已过期，请重新登录");
form.addEventListener("submit",async(e)=>{
  e.preventDefault();
  const pw=document.getElementById("pw").value.trim();
  if(!pw){showError("请输入密码");return;}
  submitBtn.disabled=true;submitBtn.textContent="验证中…";
  try{
    const fd=new FormData();fd.set("password",pw);
    const res=await fetch("/api/admin/login",{method:"POST",body:fd,redirect:"manual"});
    if(res.status===302||res.status===0){
      const loc=res.headers.get("Location")||"/admin";
      location.href=loc;
    }else if(res.status===401){
      const d=await res.json().catch(()=>({}));
      if(d.message&&d.message.includes("过多"))showLock(d.message);
      else showError(d.message||"登录失败，请检查密码");
      submitBtn.disabled=false;submitBtn.textContent="登 录";
    }else{
      location.href="/admin";
    }
  }catch(e){
    showError("网络错误，请重试");
    submitBtn.disabled=false;submitBtn.textContent="登 录";
  }
});
// Enter key
document.getElementById("pw").addEventListener("keydown",(e)=>{if(e.key==="Enter")form.requestSubmit();});
</script>
</body></html>`;

// ═══════════════════════════════════════════════════════
// 管理面板 (Apple 风格 + 默认值预填)
// ═══════════════════════════════════════════════════════
const ADMIN_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>Admin — Tom Riddle's Diary</title>
<style>
:root{
  --bg:#000;--surface:rgba(28,28,30,0.7);--surface-2:rgba(40,40,45,0.5);
  --border:rgba(255,255,255,0.08);--border-strong:rgba(255,255,255,0.15);
  --text:#f5f5f7;--text-2:#a1a1a6;--text-3:#6e6e73;
  --accent:#0a84ff;--accent-2:#409cff;--accent-bg:rgba(10,132,255,0.12);
  --green:#30d158;--green-bg:rgba(48,209,88,0.12);
  --red:#ff453a;--red-bg:rgba(255,69,58,0.12);
  --yellow:#ff9f0a;--yellow-bg:rgba(255,159,10,0.12);
  --purple:#bf5af2;--purple-bg:rgba(191,90,242,0.12);
  --font:-apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro Display","Segoe UI",Roboto,sans-serif;
  --radius:14px;--radius-lg:20px;
}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{background:var(--bg);color:var(--text);font-family:var(--font);-webkit-font-smoothing:antialiased}
body{
  min-height:100vh;padding-bottom:90px;
  background:
    radial-gradient(ellipse 800px 600px at 10% 0%,rgba(10,132,255,0.06),transparent),
    radial-gradient(ellipse 600px 400px at 90% 100%,rgba(191,90,242,0.04),transparent),
    var(--bg);
}
/* ── Header ── */
header{
  position:sticky;top:0;z-index:50;
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;
  background:rgba(0,0,0,0.7);
  backdrop-filter:blur(40px) saturate(180%);
  -webkit-backdrop-filter:blur(40px) saturate(180%);
  border-bottom:1px solid var(--border);
}
.brand{display:flex;align-items:center;gap:10px}
.brand-icon{
  width:32px;height:32px;border-radius:8px;
  background:linear-gradient(135deg,#1c1c2e,#0d0d1a);
  display:flex;align-items:center;justify-content:center;
  border:1px solid var(--border);
}
.brand-icon svg{width:18px;height:18px}
.brand h1{font-size:16px;font-weight:700;letter-spacing:-0.3px}
.brand h1 span{color:var(--purple);font-weight:500}
.header-actions{display:flex;gap:8px}
.btn{
  padding:8px 14px;border-radius:10px;border:none;
  font-size:13px;font-weight:500;cursor:pointer;
  font-family:var(--font);transition:all .2s;
}
.btn-ghost{background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}
.btn-ghost:hover{color:var(--text);border-color:var(--border-strong)}
.btn-danger{background:var(--red-bg);color:var(--red);border:1px solid rgba(255,69,58,0.2)}
.btn-danger:hover{background:rgba(255,69,58,0.2)}
.btn-primary{background:var(--accent);color:#fff;font-weight:600;padding:9px 20px}
.btn-primary:hover{background:var(--accent-2)}
.btn-primary:disabled{opacity:0.5;cursor:not-allowed}

/* ── Layout ── */
main{max-width:820px;margin:0 auto;padding:20px}
.group{
  background:var(--surface);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  margin-bottom:16px;overflow:hidden;
  animation:fadeUp .5s cubic-bezier(0.16,1,0.3,1) both;
}
.group:nth-child(1){animation-delay:0s}
.group:nth-child(2){animation-delay:.05s}
.group:nth-child(3){animation-delay:.1s}
.group:nth-child(4){animation-delay:.15s}
.group:nth-child(5){animation-delay:.2s}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

.group-header{
  display:flex;align-items:center;gap:10px;
  padding:16px 20px;
  border-bottom:1px solid var(--border);
  background:rgba(255,255,255,0.02);
}
.group-header .icon{
  width:28px;height:28px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;
}
.group-header h2{font-size:14px;font-weight:600;color:var(--text-2);letter-spacing:0.2px}
.group-header .count{
  margin-left:auto;font-size:11px;color:var(--text-3);
  background:var(--surface-2);padding:2px 8px;border-radius:10px;
}

/* ── Fields ── */
.field{
  padding:14px 20px;
  border-bottom:1px solid rgba(255,255,255,0.04);
  transition:background .2s;
}
.field:last-child{border-bottom:none}
.field:hover{background:rgba(255,255,255,0.02)}
.field-label{
  display:flex;align-items:center;gap:8px;
  margin-bottom:6px;
}
.field-label code{
  font-family:"SF Mono",Menlo,Consolas,monospace;
  font-size:12px;color:var(--accent);
  background:var(--accent-bg);
  padding:2px 7px;border-radius:5px;
  font-weight:500;
}
.field-label .badge{
  font-size:10px;font-weight:600;
  padding:2px 7px;border-radius:5px;
  text-transform:uppercase;letter-spacing:0.3px;
}
.badge-kv{background:var(--green-bg);color:var(--green)}
.badge-env{background:var(--accent-bg);color:var(--accent)}
.badge-default{background:var(--surface-2);color:var(--text-3)}
.badge-secret{background:var(--red-bg);color:var(--red)}
.field-input-wrap{position:relative;display:flex;align-items:center;gap:8px}
.field-input-wrap input{
  flex:1;padding:10px 14px;
  background:rgba(0,0,0,0.35);
  border:1px solid var(--border);
  border-radius:10px;
  color:var(--text);font-size:14px;
  font-family:"SF Mono",Menlo,Consolas,monospace;
  outline:none;
  transition:border-color .25s,box-shadow .25s;
}
.field-input-wrap input:focus{
  border-color:var(--accent);
  box-shadow:0 0 0 3px rgba(10,132,255,0.12);
}
.field-input-wrap input::placeholder{color:#444;font-family:var(--font);font-size:13px}
.toggle-visibility{
  flex-shrink:0;
  width:36px;height:36px;border-radius:8px;
  background:var(--surface-2);border:1px solid var(--border);
  color:var(--text-2);cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  transition:all .2s;
}
.toggle-visibility:hover{color:var(--text);border-color:var(--border-strong)}
.toggle-visibility svg{width:16px;height:16px}
.field-desc{font-size:12px;color:var(--text-3);margin-top:5px;line-height:1.5}
.field-desc .default-val{color:var(--text-2)}
.field.modified{background:rgba(10,132,255,0.04)}
.field.modified .field-label code{color:var(--yellow)}
.field.modified .badge{background:var(--yellow-bg);color:var(--yellow)}

/* ── Save Bar ── */
.save-bar{
  position:fixed;bottom:0;left:0;right:0;z-index:100;
  display:flex;align-items:center;gap:12px;
  padding:12px 20px;
  padding-bottom:calc(12px + env(safe-area-inset-bottom));
  background:rgba(0,0,0,0.85);
  backdrop-filter:blur(40px) saturate(180%);
  -webkit-backdrop-filter:blur(40px) saturate(180%);
  border-top:1px solid var(--border);
  transform:translateY(100%);
  transition:transform .35s cubic-bezier(0.16,1,0.3,1);
}
.save-bar.show{transform:translateY(0)}
.save-bar .status-dot{
  width:8px;height:8px;border-radius:50%;
  background:var(--text-3);flex-shrink:0;
  transition:background .3s;
}
.save-bar .status-dot.saving{background:var(--yellow);animation:pulse 1s infinite}
.save-bar .status-dot.saved{background:var(--green)}
.save-bar .status-dot.error{background:var(--red)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.save-bar .status-text{flex:1;font-size:13px;color:var(--text-2)}
.save-bar .dirty-count{
  font-size:11px;color:var(--yellow);
  background:var(--yellow-bg);padding:2px 8px;border-radius:10px;
  margin-right:8px;display:none;
}
.save-bar .dirty-count.show{display:inline}

/* ── Toast ── */
.toast{
  position:fixed;top:60px;left:50%;transform:translateX(-50%) translateY(-80px);
  padding:10px 20px;border-radius:10px;font-size:13px;font-weight:500;
  z-index:200;opacity:0;transition:all .35s cubic-bezier(0.16,1,0.3,1);
  pointer-events:none;
}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
.toast.success{background:var(--green-bg);color:var(--green);border:1px solid rgba(48,209,88,0.3)}
.toast.error{background:var(--red-bg);color:var(--red);border:1px solid rgba(255,69,58,0.3)}
.toast.info{background:var(--accent-bg);color:var(--accent);border:1px solid rgba(10,132,255,0.3)}

/* ── Responsive ── */
@media(max-width:600px){
  main{padding:12px}
  .group{border-radius:16px}
  .field{padding:12px 14px}
  .field-input-wrap input{font-size:13px;padding:9px 12px}
  header{padding:12px 14px}
  .brand h1{font-size:15px}
}
</style></head><body>
<header>
  <div class="brand">
    <div class="brand-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="#bf5af2" stroke-width="1.5">
        <path d="M4 4h16v16H4z" stroke-linejoin="round"/>
        <path d="M8 10h8M8 14h5" stroke-linecap="round"/>
      </svg>
    </div>
    <h1>Tom Riddle's <span>Diary</span></h1>
  </div>
  <div class="header-actions">
    <button class="btn btn-ghost" id="reloadBtn" title="重载所有 Worker 实例">
      <span id="reloadIcon">🔄</span> 重载
    </button>
    <button class="btn btn-danger" id="logoutBtn">退出</button>
  </div>
</header>

<main id="content">
  <div style="text-align:center;padding:60px 20px;color:var(--text-3)">
    <div style="font-size:28px;margin-bottom:12px">⏳</div>
    <div>正在加载配置…</div>
  </div>
</main>

<div class="save-bar" id="saveBar">
  <div class="status-dot" id="statusDot"></div>
  <span class="status-text" id="statusText">就绪</span>
  <span class="dirty-count" id="dirtyCount">0 项修改</span>
  <button class="btn btn-primary" id="saveBtn">💾 保存修改</button>
</div>

<div class="toast" id="toast"></div>

<script>
// ══════════════════════════════════════════════
// 配置数据 & 状态
// ══════════════════════════════════════════════
let configData = {};
let dirtyFields = new Set();
let isSaving = false;

// ══════════════════════════════════════════════
// 分组定义 (顺序 + 图标 + 标签)
// ══════════════════════════════════════════════
const GROUPS = [
  {
    key: 'secrets', label: 'API 密钥', icon: '🔑',
    fields: [
      { name: 'agnes_keys',     desc: 'Agnes 国际站 API Key，多个用逗号分隔', secret: true },
      { name: 'agnes_cn_keys',  desc: 'Agnes 国内站 API Key，多个用逗号分隔（可选）', secret: true },
      { name: 'zhipu_keys',     desc: '智谱 AI API Key，多个用逗号分隔（推荐免费兜底）', secret: true },
      { name: 'admin_password',  desc: '管理后台登录密码', secret: true },
      { name: 'admin_token',     desc: '会话签名密钥（任意随机字符串）', secret: true },
    ]
  },
  {
    key: 'models', label: '模型与接口', icon: '🤖',
    fields: [
      { name: 'agnes_model',        desc: 'Agnes 国际站模型名称' },
      { name: 'agnes_cn_model',    desc: 'Agnes 国内站模型名称' },
      { name: 'zhipu_model',       desc: '智谱模型名称' },
      { name: 'agnes_base_url',    desc: 'Agnes 国际站 API 地址' },
      { name: 'agnes_cn_base_url', desc: 'Agnes 国内站 API 地址' },
      { name: 'zhipu_base_url',    desc: '智谱 API 地址' },
    ]
  },
  {
    key: 'timing', label: '时序参数', icon: '⏱️',
    fields: [
      { name: 'idle_timeout_ms',      desc: '停笔多久后发送请求（毫秒）', num: true },
      { name: 'poll_interval_ms',     desc: '逐字显现间隔（毫秒）', num: true },
      { name: 'stroke_interval_ms',   desc: '每笔动画持续时间（毫秒）', num: true },
      { name: 'stroke_max_dur_ms',    desc: '单笔最大动画时长（毫秒）', num: true },
      { name: 'reply_fade_delay_ms',  desc: '回复显示多久后开始消失（毫秒）', num: true },
      { name: 'fade_duration_ms',     desc: '消散动画时长（毫秒）', num: true },
      { name: 'request_timeout_ms',  desc: '单次 API 请求超时（毫秒）', num: true },
    ]
  },
  {
    key: 'ink', label: '笔迹与显示', icon: '🖌️',
    fields: [
      { name: 'pressure_min_px',   desc: '最小笔迹宽度（像素）', num: true },
      { name: 'pressure_max_px',   desc: '最大笔迹宽度（像素）', num: true },
      { name: 'min_dist_px',       desc: '最小采样距离（像素）', num: true },
      { name: 'max_dist_px',       desc: '最大插值距离（像素）', num: true },
      { name: 'svg_stroke_width',  desc: 'SVG 路径描边宽度（像素）', num: true },
      { name: 'line_height_px',    desc: '行高（像素）', num: true },
      { name: 'margin_top_px',     desc: '回复顶部边距（像素）', num: true },
      { name: 'margin_x_px',       desc: '回复左侧边距（像素）', num: true },
      { name: 'font_size_px',      desc: '基础字号（像素）', num: true },
    ]
  },
  {
    key: 'memory', label: '记忆与后端', icon: '🧠',
    fields: [
      { name: 'max_history_turns', desc: '最大对话历史轮数', num: true },
      { name: 'max_retries',       desc: 'API 最大重试次数', num: true },
      { name: 'max_tokens',        desc: '模型最大输出 token 数', num: true },
      { name: 'temperature',       desc: '采样温度 0-2，越大越发散', num: true },
      { name: 'history_ttl_sec',   desc: 'KV 记忆过期时间（秒）', num: true },
    ]
  },
];

// ══════════════════════════════════════════════
// 工具函数
// ══════════════════════════════════════════════
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function maskSecret(val) {
  const s = String(val);
  if (s.length <= 8) return '•'.repeat(s.length);
  return s.substring(0, 4) + '•'.repeat(Math.max(0, s.length - 8)) + s.substring(s.length - 4);
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3000);
}

function setStatus(state, text) {
  const dot = document.getElementById('statusDot');
  const txt = document.getElementById('statusText');
  dot.className = 'status-dot ' + state;
  txt.textContent = text;
}

function updateSaveBar() {
  const bar = document.getElementById('saveBar');
  const count = document.getElementById('dirtyCount');
  if (dirtyFields.size > 0) {
    bar.classList.add('show');
    count.textContent = dirtyFields.size + ' 项修改';
    count.classList.add('show');
  } else {
    bar.classList.remove('show');
    count.classList.remove('show');
  }
}

// ══════════════════════════════════════════════
// 渲染
// ══════════════════════════════════════════════
function render() {
  const root = document.getElementById('content');
  let html = '';

  for (const group of GROUPS) {
    html += '<div class="group">';
    html += '<div class="group-header">';
    html += '<div class="icon">' + group.icon + '</div>';
    html += '<h2>' + group.label + '</h2>';
    html += '<span class="count">' + group.fields.length + ' 项</span>';
    html += '</div>';

    for (const f of group.fields) {
      const entry = ((configData.config || {})[f.name]) || {};
      const isSecret = f.secret === true;

      // 确定显示值：KV 覆盖 > 环境变量 > 默认值（始终预填）
      let displayVal = '';
      const source = entry.source || 'default';
      const defVal = entry.default || '';

      if (source === 'kv' && entry.current) {
        displayVal = isSecret ? maskSecret(entry.current) : entry.current;
      } else if (source === 'env' && entry.current) {
        displayVal = isSecret ? maskSecret(entry.current) : entry.current;
      } else {
        // 始终预填默认值到输入框
        displayVal = defVal && defVal !== '(empty)' ? defVal : '';
      }

      // Badge
      let badge = '';
      if (source === 'kv') {
        badge = '<span class="badge badge-kv">已存</span>';
      } else if (source === 'env') {
        badge = '<span class="badge badge-env">环境变量</span>';
      } else if (isSecret) {
        badge = '<span class="badge badge-secret">密钥</span>';
      } else {
        badge = '<span class="badge badge-default">默认</span>';
      }

      const inputType = isSecret ? 'password' : (f.num ? 'number' : 'text');
      // 始终显示默认值作为 placeholder 提示
      const placeholder = defVal && defVal !== '(empty)' ? '默认: ' + defVal : '未设置';

      html += '<div class="field" id="field_' + f.name + '">';
      html += '<div class="field-label">' + badge + '<code>' + f.name + '</code></div>';
      html += '<div class="field-input-wrap">';
      html += '<input type="' + inputType + '" id="f_' + f.name + '" ';
      html += 'value="' + escapeHtml(displayVal) + '" ';
      html += 'data-name="' + f.name + '" ';
      html += 'data-secret="' + isSecret + '" ';
      html += 'placeholder="' + escapeHtml(placeholder) + '" ';
      if (f.num) html += 'step="any" ';
      html += '>';
      if (isSecret) {
        html += '<button type="button" class="toggle-visibility" data-target="f_' + f.name + '" title="显示/隐藏">';
        html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/></svg>';
        html += '</button>';
      }
      html += '</div>';
      html += '<div class="field-desc">' + f.desc;
      if (defVal && defVal !== '(empty)') {
        html += ' · <span class="default-val">默认: ' + defVal + '</span>';
      }
      html += '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  root.innerHTML = html;

  // Bind events
  root.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      const name = input.dataset.name;
      dirtyFields.add(name);
      document.getElementById('field_' + name).classList.add('modified');
      setStatus('dirty', '有未保存的修改…');
      updateSaveBar();
    });
    input.addEventListener('change', () => {
      const name = input.dataset.name;
      dirtyFields.add(name);
      document.getElementById('field_' + name).classList.add('modified');
      updateSaveBar();
    });
  });

  root.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) target.type = target.type === 'password' ? 'text' : 'password';
    });
  });
}

// ══════════════════════════════════════════════
// 数据加载
// ══════════════════════════════════════════════
async function loadConfig() {
  try {
    const res = await fetch('/api/admin/config', { credentials: 'include' });
    if (res.status === 401) { location.href = '/admin/login'; return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    configData = await res.json();
    render();
  } catch (e) {
    document.getElementById('content').innerHTML =
      '<div style="text-align:center;padding:60px 20px;color:var(--red)">' +
      '<div style="font-size:28px;margin-bottom:12px">⚠️</div>' +
      '<div>加载失败: ' + e.message + '</div>' +
      '<button class="btn btn-primary" style="margin-top:16px" onclick="loadConfig()">重试</button>' +
      '</div>';
  }
}

// ═════════════════════════arma═══════════════════════
// 保存
// ══════════════════════════════════════════════
async function saveConfig() {
  if (isSaving) return;
  if (dirtyFields.size === 0) { showToast('没有需要保存的修改', 'info'); return; }

  isSaving = true;
  setStatus('saving', '保存中…');
  document.getElementById('saveBtn').disabled = true;

  const updates = {};
  dirtyFields.forEach(name => {
    const el = document.getElementById('f_' + name);
    if (el) updates[name] = el.value;
  });

  try {
    const res = await fetch('/api/admin/config', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.status === 401) { location.href = '/admin/login'; return; }
    const data = await res.json();
    if (data.success) {
      setStatus('saved', '✅ 已保存 ' + data.saved + ' 项，正在重载…');
      showToast('保存成功！重载中…', 'success');
      dirtyFields.clear();
      // Reload config to reflect new state
      await loadConfig();
      // Trigger reload
      await reloadAll();
      setStatus('saved', '✅ 所有修改已生效');
    } else {
      setStatus('error', data.message || '保存失败');
      showToast(data.message || '保存失败', 'error');
    }
  } catch (e) {
    setStatus('error', '网络错误: ' + e.message);
    showToast('网络错误: ' + e.message, 'error');
  } finally {
    isSaving = false;
    document.getElementById('saveBtn').disabled = false;
    updateSaveBar();
  }
}

async function reloadAll() {
  try {
    const res = await fetch('/api/admin/reload', { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      showToast('🔄 ' + (data.message || '重载完成'), 'success');
    }
  } catch(e) {}
}

// ══════════════════════════════════════════════
// 事件绑定
// ══════════════════════════════════════════════
document.getElementById('saveBtn').addEventListener('click', saveConfig);

document.getElementById('reloadBtn').addEventListener('click', async () => {
  setStatus('saving', '正在重载所有实例…');
  await reloadAll();
  setStatus('saved', '✅ 重载完成');
  setTimeout(() => setStatus('saved', '就绪'), 2000);
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
  location.href = '/admin/login';
});

// ══════════════════════════════════════════════
// 键盘快捷键: Cmd/Ctrl+S 保存
// ══════════════════════════════════════════════
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveConfig();
  }
});

// ══════════════════════════════════════════════
// 初始化
// ══════════════════════════════════════════════
loadConfig();
</script>
</body></html>`;

// ═══════════════════════════════════════════════════════
// 路由处理器
// ═══════════════════════════════════════════════════════

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
    return jsonResponse({ message: '尝试次数过多，请 5 分钟后再试' }, 401);
  }

  const inputHash = await hashPassword(password);
  const expectedHash = await hashPassword(adminPw);

  if (inputHash !== expectedHash) {
    fails++;
    await env.RIDDLE_KV.put(failKey, String(fails), { expirationTtl: 300 });
    return jsonResponse({ message: '密码错误（' + fails + '/5）' }, 401);
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
  for (const name of Object.keys(VAR_DOCS)) allVars.add(name);
  allVars.add('admin_password');
  allVars.add('admin_token');
  for (const k of Object.keys(kvConfig)) allVars.add(k);

  const result: Record<string, any> = {};
  for (const name of allVars) {
    const docs = (VAR_DOCS as Record<string, any>)[name];
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

    result[name] = {
      current: isSecret && current ? maskSecret(current) : current,
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

// ═══════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════

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
