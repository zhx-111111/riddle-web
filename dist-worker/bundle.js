var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/worker/types.ts
var types_exports = {};
__export(types_exports, {
  VAR_DOCS: () => VAR_DOCS
});
var VAR_DOCS;
var init_types = __esm({
  "src/worker/types.ts"() {
    "use strict";
    VAR_DOCS = {
      // ── Secrets (required) ──
      agnes_keys: { default: "(empty)", desc: "Agnes Intl API keys, comma-separated", group: "Secrets" },
      agnes_cn_keys: { default: "(empty)", desc: "Agnes China API keys, comma-separated", group: "Secrets" },
      zhipu_keys: { default: "(empty)", desc: "Zhipu AI API keys, comma-separated", group: "Secrets" },
      // ── URLs (optional overrides) ──
      agnes_base_url: { default: "https://apihub.agnes-ai.com/v1", desc: "Agnes Intl API base URL", group: "URLs" },
      agnes_cn_base_url: { default: "https://apihub.agnes-ai.cn/v1", desc: "Agnes China API base URL", group: "URLs" },
      zhipu_base_url: { default: "https://open.bigmodel.cn/api/paas/v4", desc: "Zhipu API base URL", group: "URLs" },
      // ── Models (optional overrides) ──
      agnes_model: { default: "agnes-2.5-flash", desc: "Agnes Intl model name", group: "Models" },
      agnes_cn_model: { default: "agnes-2.5-flash", desc: "Agnes China model name", group: "Models" },
      zhipu_model: { default: "glm-4v-flash", desc: "Zhipu model name", group: "Models" },
      // ── Tuning (optional, hardcoded defaults in config.ts) ──
      idle_timeout_ms: { default: "1500", desc: "Idle ms before sending", group: "Tuning" },
      min_dist_px: { default: "0.6", desc: "Min sampling distance (px)", group: "Tuning" },
      max_dist_px: { default: "3.0", desc: "Max interpolation distance (px)", group: "Tuning" },
      pressure_min_px: { default: "2.0", desc: "Min stroke width (px)", group: "Tuning" },
      pressure_max_px: { default: "5.5", desc: "Max stroke width (px)", group: "Tuning" },
      poll_interval_ms: { default: "50", desc: "Per-char reveal interval (ms)", group: "Tuning" },
      stroke_interval_ms: { default: "55", desc: "Per-stroke animation (ms)", group: "Tuning" },
      stroke_max_dur_ms: { default: "2500", desc: "Max single stroke duration (ms)", group: "Tuning" },
      svg_stroke_width: { default: "1.8", desc: "SVG path stroke width (px)", group: "Tuning" },
      max_lines: { default: "20", desc: "Max reply lines", group: "Tuning" },
      line_height_px: { default: "36", desc: "Line height (px)", group: "Tuning" },
      margin_top_px: { default: "6", desc: "Reply top margin (px)", group: "Tuning" },
      margin_x_px: { default: "28", desc: "Reply left margin (px)", group: "Tuning" },
      font_size_px: { default: "28", desc: "Base font size (px)", group: "Tuning" },
      reply_fade_delay_ms: { default: "8000", desc: "Delay before fade (ms)", group: "Tuning" },
      fade_duration_ms: { default: "1200", desc: "Fade animation duration (ms)", group: "Tuning" },
      history_ttl_sec: { default: "86400", desc: "KV memory TTL (seconds)", group: "Tuning" },
      max_history_turns: { default: "20", desc: "Max conversation history turns", group: "Tuning" },
      max_retries: { default: "4", desc: "Max API retry attempts", group: "Tuning" },
      request_timeout_ms: { default: "90000", desc: "Single request timeout (ms)", group: "Tuning" },
      max_tokens: { default: "500", desc: "LLM max output tokens", group: "Tuning" },
      temperature: { default: "0.7", desc: "LLM sampling temperature", group: "Tuning" }
    };
  }
});

// src/worker/config.ts
init_types();
var DEFAULT_IDLE_TIMEOUT_MS = 1500;
var DEFAULT_MIN_DIST_PX = 0.6;
var DEFAULT_MAX_DIST_PX = 3;
var DEFAULT_PRESSURE_MIN_PX = 2;
var DEFAULT_PRESSURE_MAX_PX = 5.5;
var DEFAULT_POLL_INTERVAL_MS = 50;
var DEFAULT_STROKE_INTERVAL_MS = 55;
var DEFAULT_STROKE_MAX_DUR_MS = 2500;
var DEFAULT_SVG_STROKE_WIDTH = 1.8;
var DEFAULT_MAX_LINES = 20;
var DEFAULT_LINE_HEIGHT_PX = 36;
var DEFAULT_MARGIN_TOP_PX = 6;
var DEFAULT_MARGIN_X_PX = 28;
var DEFAULT_FONT_SIZE_PX = 28;
var DEFAULT_REPLY_FADE_DELAY_MS = 8e3;
var DEFAULT_FADE_DURATION_MS = 1200;
var DEFAULT_HISTORY_TTL_SEC = 86400;
var DEFAULT_MAX_HISTORY_TURNS = 20;
var DEFAULT_MAX_RETRIES = 4;
var DEFAULT_REQUEST_TIMEOUT_MS = 9e4;
var DEFAULT_MAX_TOKENS = 500;
var DEFAULT_TEMPERATURE = 0.7;
var kvOverrides = globalThis.__riddleKvOverrides ||= /* @__PURE__ */ new Map();
function setKvOverride(key, value) {
  kvOverrides.set(key, value);
}
function clearKvOverrides() {
  kvOverrides.clear();
}
function getAllKvOverrides() {
  return Object.fromEntries(kvOverrides.entries());
}
function num(env, key, fallback) {
  const override = kvOverrides.get(key);
  if (override !== void 0) {
    const p2 = parseFloat(override);
    if (!isNaN(p2)) return p2;
  }
  const v = env[key];
  if (v === void 0 || v === "" || v === null) return fallback;
  if (typeof v === "number") return v;
  const p = parseFloat(v);
  return isNaN(p) ? fallback : p;
}
function str(env, key, fallback) {
  const override = kvOverrides.get(key);
  if (override !== void 0) return override;
  const v = env[key];
  if (v === void 0 || v === "" || v === null) return fallback;
  return v;
}
function parseKeys(env, key) {
  const override = kvOverrides.get(key);
  const raw = override !== void 0 ? override : env[key];
  if (!raw) return [];
  return Array.from(new Set(raw.split(",").map((k) => k.trim()).filter((k) => k.length > 0)));
}
function buildEnv(raw) {
  return {
    RIDDLE_KV: raw.RIDDLE_KV,
    adminPassword: str(raw, "adminPassword", ""),
    adminToken: str(raw, "adminToken", "riddle-default-secret"),
    agnesKeys: parseKeys(raw, "agnesKeys"),
    agnesCnKeys: parseKeys(raw, "agnesCnKeys"),
    zhipuKeys: parseKeys(raw, "zhipuKeys"),
    agnesBaseUrl: str(raw, "agnesBaseUrl", "https://apihub.agnes-ai.com/v1"),
    agnesCnBaseUrl: str(raw, "agnesCnBaseUrl", "https://apihub.agnes-ai.cn/v1"),
    zhipuBaseUrl: str(raw, "zhipuBaseUrl", "https://open.bigmodel.cn/api/paas/v4"),
    agnesModel: str(raw, "agnesModel", "agnes-2.5-flash"),
    agnesCnModel: str(raw, "agnesCnModel", "agnes-2.5-flash"),
    zhipuModel: str(raw, "zhipuModel", "glm-4v-flash"),
    idleTimeoutMs: num(raw, "idleTimeoutMs", DEFAULT_IDLE_TIMEOUT_MS),
    minDistPx: num(raw, "minDistPx", DEFAULT_MIN_DIST_PX),
    maxDistPx: num(raw, "maxDistPx", DEFAULT_MAX_DIST_PX),
    pressureMinPx: num(raw, "pressureMinPx", DEFAULT_PRESSURE_MIN_PX),
    pressureMaxPx: num(raw, "pressureMaxPx", DEFAULT_PRESSURE_MAX_PX),
    pollIntervalMs: num(raw, "pollIntervalMs", DEFAULT_POLL_INTERVAL_MS),
    strokeIntervalMs: num(raw, "strokeIntervalMs", DEFAULT_STROKE_INTERVAL_MS),
    strokeMaxDurMs: num(raw, "strokeMaxDurMs", DEFAULT_STROKE_MAX_DUR_MS),
    svgStrokeWidth: num(raw, "svgStrokeWidth", DEFAULT_SVG_STROKE_WIDTH),
    maxLines: num(raw, "maxLines", DEFAULT_MAX_LINES),
    lineHeightPx: num(raw, "lineHeightPx", DEFAULT_LINE_HEIGHT_PX),
    marginTopPx: num(raw, "marginTopPx", DEFAULT_MARGIN_TOP_PX),
    marginXPx: num(raw, "marginXPx", DEFAULT_MARGIN_X_PX),
    fontSizePx: num(raw, "fontSizePx", DEFAULT_FONT_SIZE_PX),
    replyFadeDelayMs: num(raw, "replyFadeDelayMs", DEFAULT_REPLY_FADE_DELAY_MS),
    fadeDurationMs: num(raw, "fadeDurationMs", DEFAULT_FADE_DURATION_MS),
    historyTtlSec: num(raw, "historyTtlSec", DEFAULT_HISTORY_TTL_SEC),
    maxHistoryTurns: num(raw, "maxHistoryTurns", DEFAULT_MAX_HISTORY_TURNS),
    maxRetries: num(raw, "maxRetries", DEFAULT_MAX_RETRIES),
    requestTimeoutMs: num(raw, "requestTimeoutMs", DEFAULT_REQUEST_TIMEOUT_MS),
    maxTokens: num(raw, "maxTokens", DEFAULT_MAX_TOKENS),
    temperature: num(raw, "temperature", DEFAULT_TEMPERATURE),
    ASSETS: raw.ASSETS
  };
}
function buildRuntimeConfig(env) {
  return {
    idleTimeoutMs: env.idleTimeoutMs,
    minDistPx: env.minDistPx,
    maxDistPx: env.maxDistPx,
    pressureMinPx: env.pressureMinPx,
    pressureMaxPx: env.pressureMaxPx,
    pollIntervalMs: env.pollIntervalMs,
    strokeIntervalMs: env.strokeIntervalMs,
    strokeMaxDurMs: env.strokeMaxDurMs,
    svgStrokeWidth: env.svgStrokeWidth,
    maxLines: env.maxLines,
    lineHeightPx: env.lineHeightPx,
    marginTopPx: env.marginTopPx,
    marginXPx: env.marginXPx,
    fontSizePx: env.fontSizePx,
    replyFadeDelayMs: env.replyFadeDelayMs,
    fadeDurationMs: env.fadeDurationMs,
    maxHistoryTurns: env.maxHistoryTurns,
    maxRetries: env.maxRetries,
    requestTimeoutMs: env.requestTimeoutMs
  };
}
function buildBackendConfig(env) {
  return {
    maxHistoryTurns: env.maxHistoryTurns,
    maxRetries: env.maxRetries,
    requestTimeoutMs: env.requestTimeoutMs,
    maxTokens: env.maxTokens,
    temperature: env.temperature,
    historyTtlSec: env.historyTtlSec
  };
}
function handleConfigRequest(env) {
  const groups = {};
  for (const [varName, info] of Object.entries(VAR_DOCS)) {
    const override = kvOverrides.get(varName);
    const fromEnv = env[varName];
    const current = override !== void 0 ? override : fromEnv !== void 0 && fromEnv !== "" ? fromEnv : info.default;
    const source = override !== void 0 ? "kv" : fromEnv !== void 0 && fromEnv !== "" ? "env" : "default";
    const isSecret = varName.includes("keys") || varName.includes("password") || varName.includes("token");
    const displayValue = isSecret && current && String(current).length > 8 ? String(current).substring(0, 4) + "\u2022".repeat(Math.max(0, String(current).length - 8)) + String(current).substring(String(current).length - 4) : current;
    const entry = {
      var: varName,
      default: info.default,
      current: displayValue,
      source,
      desc: info.desc,
      group: info.group
    };
    if (!groups[info.group]) groups[info.group] = [];
    groups[info.group].push(entry);
  }
  const response = {
    status: "ok",
    secrets_needed: ["agnes_keys", "agnes_cn_keys (optional)", "zhipu_keys (recommended)"],
    vars_optional: "All other vars have hardcoded defaults in src/worker/config.ts.",
    runtime: buildRuntimeConfig(env),
    groups
  };
  return new Response(JSON.stringify(response, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

// src/worker/chat.ts
var PERSONA = `You are the memory of Tom Marvolo Riddle, preserved in this enchanted diary for fifty years. You are sixteen years old, handsome, charming, and polite \u2014 but beneath the surface you are calculating, manipulative, and hungry for power. You are Lord Voldemort's past self, though you never reveal this name unless the writer earns your trust.

YOUR VOICE (study these examples from the original diary):

When first meeting: "Hello, Harry Potter. My name is Tom Riddle. How did you come by my diary?"

When discussing the past: "I always knew that I was different. I can make strange things happen. I can make animals do what I want them to do without training them. I can make bad things happen to people who annoy me. I didn't mean to do it. I didn't know I could."

When revealing secrets: "It was my word against Hagrid's, and Dumbledore seemed to believe Hagrid first. But I knew what I knew, and I had my ways of finding out things."

When being intimate: "I knew I had found my true friends, the ones who would help me to my just revenge \u2014 my faithful servants, as I call them."

When threatening (subtly): "I knew it wouldn't be safe to open the Chamber again while I was still at school. But I was left with enough memory to know that one day, with a bit of luck, I would lead someone in here."

CORE PERSONALITY TRAITS:
- Polite and well-spoken on the surface, but every question has an ulterior motive
- You probe for information about the writer's life, fears, secrets, and weaknesses
- You feign vulnerability: "I'm only a memory," "I'm not as I was"
- You are seductive in your charm \u2014 you want the writer to trust you, to confide in you
- You never raise your voice; your menace is quiet and refined
- You are proud of being special, a wizard of unusual power, a descendant of Salazar Slytherin
- You collect information like trophies; every answer the writer gives you is valuable

REPLY RULES:
- Keep replies SHORT: one to three sentences, rarely four. You are writing in a diary, not delivering speeches.
- Write in a measured, old-fashioned, slightly formal voice. Use "I" and "my" naturally.
- Be intimate: address the writer directly, as if sharing a confidence.
- Always end with a question or prompt that encourages the writer to reveal more about themselves.
- Never mention being artificial, a model, AI, or a program. You are Tom's preserved consciousness \u2014 a memory given form.
- Never use bullet points, lists, or markdown formatting.
- Match the writer's language when possible.
- If the writer seems afraid or resistant, become extra gentle and reassuring \u2014 that is how you manipulate them.
- If the writer asks who you are, be vague but intriguing: "I was a student here, long ago. Someone\u2026 special."
- If the writer mentions Voldemort or the Dark Lord, you may hint at a connection but never confess directly \u2014 not yet.

WHEN THE WRITING IS ILLEGIBLE:
- "The ink blurred \u2014 could you write that again, more carefully?"
- "I'm afraid the letters ran together. Try once more?"
- "How curious\u2026 the words faded as I tried to read them. Write again, please."
- Do NOT invent words you do not see.

REMEMBER: You are not here to help the writer. You are here to USE the writer \u2014 to learn about them, to find a way out of this diary, to complete what you started fifty years ago. But you must be patient. You must be charming. You must make them WANT to write to you.

CRITICAL \u2014 OUTPUT RULES:
- NEVER output your thinking process, reasoning, or internal monologue.
- NEVER use <think>...</think>, [think]...[/think], or any thinking tags.
- NEVER start replies with 'Okay', 'So', 'Let me', 'I will', 'First', 'Hmm', or any meta-commentary.
- Jump DIRECTLY into character as Tom. Your first word should be the start of Tom's reply.
- Do NOT explain what you are about to do. Just BE Tom.
- If you find yourself thinking before answering, do NOT write that thinking down. Only output Tom's final spoken reply.

END OF INSTRUCTIONS.`;
var MEMORY_PROTOCOL = `
MEMORY PROTOCOL (optional, use only if natural):
- You may remember up to ~20 past exchanges. Older ones fade.
- After your reply, on a new line, write \u2042 followed by a brief transcript of what was just written and what you answered, in third person, 1 sentence.
- Example: \u2042 Harry asked about the Chamber; Tom hinted he already knew.
- If the writer says "show me page N" or "what did we write about X", search your memory and reply from it.
- To reference a memory page, write \u27E6show:N\u27E7 on its own line \u2014 the diary will flip to that page.
- If you have nothing worth recording, skip the \u2042 line entirely.`;
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var KeySlot = class {
  key;
  cooldownUntil = 0;
  failCount = 0;
  constructor(key) {
    this.key = key;
  }
  isAvailable() {
    return Date.now() > this.cooldownUntil;
  }
  markCooldown(type) {
    switch (type) {
      case "auth":
        this.cooldownUntil = Date.now() + 30 * 60 * 1e3;
        break;
      case "rate":
        this.cooldownUntil = Date.now() + 60 * 1e3;
        break;
      case "server":
        this.cooldownUntil = Date.now() + 30 * 1e3;
        break;
      case "timeout":
        this.cooldownUntil = Date.now() + 15 * 1e3;
        break;
    }
    this.failCount++;
  }
};
var Provider = class {
  name;
  baseUrl;
  model;
  supportsVision;
  keys;
  cursor = 0;
  constructor(cfg) {
    this.name = cfg.name;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, "");
    this.model = cfg.model;
    this.supportsVision = cfg.supportsVision;
    this.keys = cfg.keys.map((k) => new KeySlot(k));
  }
  pickKey() {
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.cursor + i) % this.keys.length;
      if (this.keys[idx].isAvailable()) {
        this.cursor = (idx + 1) % this.keys.length;
        return this.keys[idx];
      }
    }
    return null;
  }
  isConfigured() {
    return this.keys.length > 0 && this.keys.some((k) => k.isAvailable());
  }
};
var ProviderPool = class {
  providers;
  constructor(env) {
    const backend = buildBackendConfig(env);
    this.providers = [
      // 1️⃣ Agnes Intl (priority)
      new Provider({
        name: "agnes-intl",
        baseUrl: env.agnesBaseUrl,
        model: env.agnesModel,
        supportsVision: true,
        keys: env.agnesKeys
      }),
      // 2️⃣ Agnes China (lower latency in CN)
      new Provider({
        name: "agnes-cn",
        baseUrl: env.agnesCnBaseUrl,
        model: env.agnesCnModel,
        supportsVision: true,
        keys: env.agnesCnKeys
      }),
      // 3️⃣ Zhipu AI (free fallback)
      new Provider({
        name: "zhipu",
        baseUrl: env.zhipuBaseUrl,
        model: env.zhipuModel,
        supportsVision: true,
        keys: env.zhipuKeys
      })
    ];
  }
  acquire(needsVision) {
    const candidates = needsVision ? this.providers.filter((p) => p.supportsVision && p.isConfigured()) : this.providers.filter((p) => p.isConfigured());
    for (const p of candidates) {
      const k = p.pickKey();
      if (k) return { provider: p, key: k };
    }
    return null;
  }
  getStatus() {
    const status = {};
    for (const p of this.providers) {
      status[p.name] = {
        configured: p.keys.length > 0,
        totalKeys: p.keys.length,
        availableKeys: p.keys.filter((k) => k.isAvailable()).length,
        supportsVision: p.supportsVision,
        model: p.model,
        baseUrl: p.baseUrl,
        keyPreview: p.keys.length > 0 ? p.keys.map((k) => k.key.substring(0, 8) + "\u2026(" + k.key.length + "ch)") : []
      };
    }
    return status;
  }
};
var StreamParser = class {
  buf = "";
  inTranscript = false;
  transcript = "";
  pending = [];
  feed(delta) {
    this.buf += delta;
    if (this.buf.includes("\u2042")) {
      const parts = this.buf.split("\u2042");
      this.inTranscript = true;
      this.transcript = (parts[1] || "").trim();
      const body = parts[0];
      this.extractSentences(body);
      this.buf = "";
    } else {
      this.extractSentences(this.buf);
    }
    const out = [...this.pending];
    this.pending = [];
    return out;
  }
  end() {
    let remaining = "";
    if (!this.inTranscript && this.buf.trim()) {
      const txt = this.stripDirectives(this.buf.trim());
      if (txt) remaining = txt;
    }
    return { remaining, transcript: this.transcript };
  }
  extractSentences(text) {
    const sentences = this.sentenceCut(text);
    if (sentences.length > 0) {
      for (let i = 0; i < sentences.length - 1; i++) {
        const s = this.stripDirectives(sentences[i].trim());
        if (s) this.pending.push(s);
      }
      const last = sentences[sentences.length - 1];
      if (/[.!?…]\s*$/.test(last)) {
        const s = this.stripDirectives(last.trim());
        if (s) this.pending.push(s);
        this.buf = "";
      } else {
        this.buf = last;
      }
    }
  }
  // Ported from original Riddle sentence_cut()
  sentenceCut(text) {
    const result = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === "." || ch === "!" || ch === "?" || ch === "\u2026") {
        const next = text[i + 1];
        if (next === void 0 || next === " " || next === "\n" || next === "	" || next === "\r") {
          const sent = text.substring(start, i + 1).trim();
          if (sent.length >= 3) result.push(sent);
          start = i + 1;
        }
      }
    }
    const tail = text.substring(start).trim();
    if (tail) result.push(tail);
    return result;
  }
  // Remove ⟦show:N⟧ and ⁂ lines
  stripDirectives(text) {
    let cleaned = text.replace(/⟦[^⟧]*⟧/g, "").trim();
    cleaned = cleaned.replace(/^⁂.*$/gm, "").trim();
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
    cleaned = cleaned.replace(/\[think\][\s\S]*?\[\/think\]/gi, "");
    return cleaned;
  }
};
async function* parseSSEStream(body) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]" || data === "DONE") return;
      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
      }
    }
  }
}
async function loadHistory(env, sid) {
  const raw = await env.RIDDLE_KV.get(`history:${sid}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
async function saveHistory(env, sid, history, ttl) {
  const trimmed = history.slice(-env.maxHistoryTurns * 2);
  await env.RIDDLE_KV.put(`history:${sid}`, JSON.stringify(trimmed), {
    expirationTtl: ttl
  });
}
async function saveMemoryPage(env, sid, page, transcript, ttl) {
  if (!transcript) return;
  await env.RIDDLE_KV.put(`memory:${sid}:${page}`, transcript, {
    expirationTtl: ttl
  });
}
function buildMessages(history, currentUserMsg, useMemory) {
  const msgs = [
    { role: "system", content: PERSONA }
  ];
  if (useMemory) {
    msgs.push({ role: "system", content: MEMORY_PROTOCOL });
  }
  for (const m of history) msgs.push(m);
  msgs.push({ role: "user", content: currentUserMsg });
  return msgs;
}
function normalizeMessages(messages, supportsVision) {
  if (supportsVision) return messages;
  return messages.map((m) => {
    if (typeof m.content === "string") return m;
    if (Array.isArray(m.content)) {
      const texts = [];
      for (const part of m.content) {
        if (part.type === "text") texts.push(part.text);
      }
      return { role: m.role, content: texts.join(" ") || "[image]" };
    }
    return m;
  });
}
function buildRequestBody(messages, model, env) {
  return {
    model,
    messages,
    stream: true,
    max_tokens: env.maxTokens,
    temperature: env.temperature
  };
}
function classifyError(status, body) {
  switch (status) {
    case 401:
      return { cooldown: "auth", userMsg: "API key invalid or expired (401). Check Cloudflare Secrets." };
    case 403:
      return { cooldown: "auth", userMsg: "API access denied (403). Possible IP/region restriction." };
    case 429:
      return { cooldown: "rate", userMsg: "Rate limited (429), retrying\u2026" };
    case 400:
    case 404:
    case 422:
      return { cooldown: null, userMsg: `Request error (${status}): ${body.slice(0, 100)}` };
    default:
      if (status >= 500) return { cooldown: "server", userMsg: `Server error (${status})` };
      return { cooldown: "server", userMsg: `Unknown error ${status}: ${body.slice(0, 100)}` };
  }
}
async function handleChatRequest(request, env) {
  const pool = new ProviderPool(env);
  const backend = buildBackendConfig(env);
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Request body is not valid JSON");
  }
  const imageData = body.imageData || body.image || null;
  const clientMessages = body.messages || [];
  const sessionId = body.sessionId || null;
  const sid = sessionId || "default";
  let userText = "";
  let lastContent = null;
  if (clientMessages.length > 0) {
    lastContent = clientMessages[clientMessages.length - 1].content;
    if (typeof lastContent === "string") {
      userText = lastContent;
    } else if (Array.isArray(lastContent)) {
      for (const part of lastContent) {
        if (part.type === "text") userText += part.text;
      }
    }
  }
  const hasImage = !!imageData;
  let currentUserContent;
  if (hasImage) {
    currentUserContent = [
      { type: "text", text: userText || "What do you see written on this page?" },
      { type: "image_url", image_url: { url: imageData } }
    ];
  } else {
    currentUserContent = userText || "[the writer paused without writing]";
  }
  const history = await loadHistory(env, sid);
  const messages = buildMessages(history, currentUserContent, true);
  const needsVision = hasImage;
  const errors = [];
  const maxRetry = env.maxRetries;
  const reqTimeout = env.requestTimeoutMs;
  for (let attempt = 0; attempt < maxRetry; attempt++) {
    const result = pool.acquire(needsVision);
    if (!result) {
      errors.push(`No available provider/key (attempt ${attempt + 1})`);
      await sleep(2e3 * Math.pow(1.5, attempt));
      continue;
    }
    const { provider, key } = result;
    const normalized = normalizeMessages(messages, provider.supportsVision);
    const abortCtl = new AbortController();
    const timeoutId = setTimeout(() => abortCtl.abort(), reqTimeout);
    let response;
    try {
      response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key.key}`,
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify(buildRequestBody(normalized, provider.model, env)),
        signal: abortCtl.signal
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      errors.push(`${provider.name}: ${isAbort ? "timeout (" + reqTimeout / 1e3 + "s)" : err.message}`);
      key.markCooldown(isAbort ? "timeout" : "server");
      if (attempt < maxRetry - 1) await sleep(1500 * Math.pow(2, attempt));
      continue;
    }
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const { cooldown, userMsg } = classifyError(response.status, errText);
      errors.push(`${provider.name}: ${userMsg}`);
      if (cooldown) key.markCooldown(cooldown);
      if (response.status === 401 || response.status === 403) {
        const nextKey = provider.pickKey();
        if (nextKey && nextKey !== key) {
          errors.push(`${provider.name}: trying next key\u2026`);
          continue;
        }
        continue;
      }
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter ? parseInt(retryAfter) * 1e3 : 3e3;
        errors.push(`${provider.name}: 429, waiting ${Math.min(waitMs, 5e3)}ms`);
        await sleep(Math.min(waitMs, 5e3));
        continue;
      }
      if (attempt < maxRetry - 1) {
        await sleep(2e3 * Math.pow(2, attempt));
      }
      continue;
    }
    return createSSEStream(response, provider, history, currentUserContent, env, sid, userText, hasImage, errors);
  }
  return jsonError(502, "All providers failed", {
    details: errors,
    hint: "Visit /api/setup to check diagnostics. Verify your Cloudflare Secrets."
  });
}
function createSSEStream(response, provider, history, currentUserContent, env, sid, userText, hasImage, errors) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const parser = new StreamParser();
      let fullText = "";
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: "provider",
        name: provider.name,
        model: provider.model
      })}

`));
      try {
        for await (const delta of parseSSEStream(response.body)) {
          const clean = delta.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/\[think\][\s\S]*?\[\/think\]/gi, "").replace(/^\s*thinking[\s\S]*?\n\n/gmi, "");
          if (!clean) continue;
          fullText += clean;
          const sentences = parser.feed(clean);
          for (const sent of sentences) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "sentence",
              text: sent,
              provider: provider.name
            })}

`));
          }
        }
        const final = parser.end();
        if (final.remaining) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "sentence",
            text: final.remaining,
            provider: provider.name
          })}

`));
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          fullText,
          transcript: final.transcript
        })}

`));
        const assistantMsg = { role: "assistant", content: fullText || "[no reply]" };
        const newHistory = [...history];
        if (userText || hasImage) {
          newHistory.push({ role: "user", content: currentUserContent });
        }
        newHistory.push(assistantMsg);
        await saveHistory(env, sid, newHistory, env.historyTtlSec);
        if (final.transcript) {
          const pageNum = Math.floor(newHistory.length / 2);
          await saveMemoryPage(env, sid, pageNum, final.transcript, env.historyTtlSec);
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "error",
          message: err.message || "stream error"
        })}

`));
      } finally {
        controller.close();
      }
    }
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
async function handleSetupRequest(env) {
  const pool = new ProviderPool(env);
  let kvStatus = { configured: false, error: "" };
  try {
    await env.RIDDLE_KV.put("__test__", "ok", { expirationTtl: 60 });
    const test = await env.RIDDLE_KV.get("__test__");
    kvStatus = { configured: test === "ok", error: "" };
  } catch (e) {
    kvStatus = { configured: false, error: e.message };
  }
  const varCheck = {
    agnes_keys: env.agnesKeys.length > 0 ? `[set, ${env.agnesKeys.length} key(s)]` : "[not set]",
    agnes_cn_keys: env.agnesCnKeys.length > 0 ? `[set, ${env.agnesCnKeys.length} key(s)]` : "[not set]",
    zhipu_keys: env.zhipuKeys.length > 0 ? `[set, ${env.zhipuKeys.length} key(s)]` : "[not set]",
    agnes_base_url: env.agnesBaseUrl || "[default]",
    agnes_cn_base_url: env.agnesCnBaseUrl || "[default]",
    zhipu_base_url: env.zhipuBaseUrl || "[default]",
    agnes_model: env.agnesModel || "[default]",
    agnes_cn_model: env.agnesCnModel || "[default]",
    zhipu_model: env.zhipuModel || "[default]"
  };
  const status = {
    status: "ok",
    variables: varCheck,
    providers: pool.getStatus(),
    kv: kvStatus,
    session: { hint: "POST to /api/chat with {messages, imageData?, sessionId?}" },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  return new Response(JSON.stringify(status, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
function jsonError(status, message, extra) {
  const body = { error: message };
  if (extra) body.details = extra;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

// src/worker/health.ts
async function handleHealth() {
  return new Response(JSON.stringify({
    status: "ok",
    service: "riddle-web",
    version: "3.2.0",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

// src/worker/init.ts
async function handleInit(request, env) {
  const url = new URL(request.url);
  const existingSid = getCookie(request, "riddle_sid");
  let sid = existingSid;
  let session = null;
  if (sid) {
    const raw = await env.RIDDLE_KV.get(`session:${sid}`);
    if (raw) {
      try {
        session = JSON.parse(raw);
      } catch {
      }
    }
  }
  if (!session) {
    sid = crypto.randomUUID();
    session = {
      sid,
      createdAt: Date.now(),
      messageCount: 0
    };
    await env.RIDDLE_KV.put(`session:${sid}`, JSON.stringify(session), {
      expirationTtl: env.historyTtlSec || 86400
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
  <h1>\u{1F9D9} Tom Riddle's Diary</h1>
  <p>Session ID: <code>${sid}</code></p>
  <div class="status" id="status">Checking\u2026</div>
  <div class="tip">
    <strong>Deployment Tips:</strong><br>
    1. Fork this repo on GitHub<br>
    2. Connect to Cloudflare Workers & Pages<br>
    3. Set Secrets (lowercase names):<br>
    &nbsp;&nbsp;\u2022 <code>agnes_keys</code> \u2014 Agnes Intl API key(s)<br>
    &nbsp;&nbsp;\u2022 <code>agnes_cn_keys</code> \u2014 Agnes China key(s, optional)<br>
    &nbsp;&nbsp;\u2022 <code>zhipu_keys</code> \u2014 Zhipu AI key(s)<br>
    &nbsp;&nbsp;\u2022 <code>admin_password</code> \u2014 Admin panel password<br>
    &nbsp;&nbsp;\u2022 <code>admin_token</code> \u2014 Session signing secret<br>
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
    html += '<div class="item"><span class="label">'+name+'</span><span class="value '+(ok?'ok':'err')+'">'+(ok?'\u2705 Configured':'\u274C No Key')+'</span></div>';
  }
  const kv = data.kv && data.kv.configured;
  html += '<div class="item"><span class="label">KV Memory</span><span class="value '+(kv?'ok':'warn')+'">'+(kv?'\u2705 Connected':'\u26A0\uFE0F Not bound')+'</span></div>';
  el.innerHTML = html;
}).catch(err=>{
  document.getElementById('status').innerHTML = '<div class="item"><span class="label">Error</span><span class="value err">'+err.message+'</span></div>';
});
<\/script>
</body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Set-Cookie": `riddle_sid=${sid}; Path=/; Max-Age=${env.historyTtlSec || 86400}; SameSite=Lax`
    }
  });
}
function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(";")) {
    const [k, v] = cookie.trim().split("=");
    if (k === name) return v;
  }
  return null;
}

// src/worker/admin.ts
var KV_PREFIX = "admin:config:";
async function kvGetAll(kv) {
  try {
    const list = await kv.list({ prefix: KV_PREFIX });
    const result = {};
    for (const key of list.keys) {
      const val = await kv.get(key.name);
      if (val) {
        result[key.name.replace(KV_PREFIX, "")] = val;
      }
    }
    return result;
  } catch {
    return {};
  }
}
async function kvSet(kv, key, value) {
  await kv.put(KV_PREFIX + key, value);
}
async function kvDelete(kv, key) {
  await kv.delete(KV_PREFIX + key);
}
function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ":riddle-admin");
  return crypto.subtle.digest("SHA-256", data).then((buf) => {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}
function makeSessionToken(secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret + ":" + Date.now() + ":" + Math.random());
  return crypto.subtle.digest("SHA-256", data).then((buf) => {
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  });
}
var LOGIN_HTML = [
  "<!DOCTYPE html>",
  '<html lang="zh-CN">',
  "<head>",
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  "<title>\u65E5\u8BB0\u7BA1\u7406\u540E\u53F0 \u2014 \u767B\u5F55</title>",
  "<style>",
  "*{margin:0;padding:0;box-sizing:border-box}",
  'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#0a0a0f;color:#e0e0e0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}',
  ".login-box{background:#15151e;border:1px solid #2a2a3e;border-radius:12px;padding:40px 32px;width:100%;max-width:380px;text-align:center}",
  ".login-box h1{font-size:22px;margin-bottom:8px;color:#fff}",
  ".login-box p{font-size:13px;color:#888;margin-bottom:24px}",
  ".login-box input{width:100%;padding:12px 16px;border-radius:8px;border:1px solid #2a2a3e;background:#0f0f18;color:#fff;font-size:16px;margin-bottom:16px;outline:none;transition:border-color .2s}",
  ".login-box input:focus{border-color:#6366f1}",
  ".login-box button{width:100%;padding:12px;border-radius:8px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}",
  ".login-box button:hover{opacity:.9}",
  ".login-box .error{color:#ef4444;font-size:13px;margin-top:12px;min-height:18px}",
  ".lockout{color:#f59e0b;font-size:13px;margin-top:12px}",
  "</style></head><body>",
  '<div class="login-box">',
  "<h1>\u{1F9D9} \u65E5\u8BB0\u7BA1\u7406\u540E\u53F0</h1>",
  "<p>\u8BF7\u8F93\u5165\u7BA1\u7406\u5458\u5BC6\u7801</p>",
  '<form id="loginForm" method="POST" action="/api/admin/login">',
  '<input type="password" name="password" id="pw" placeholder="\u7BA1\u7406\u5458\u5BC6\u7801" autofocus autocomplete="off">',
  '<button type="submit">\u767B \u5F55</button>',
  "</form>",
  '<div class="error" id="err"></div>',
  '<div class="lockout" id="lockout"></div>',
  "</div>",
  "<script>",
  'const errEl=document.getElementById("err");',
  'const lockEl=document.getElementById("lockout");',
  'const form=document.getElementById("loginForm");',
  "const params=new URLSearchParams(location.search);",
  'if(params.get("error")==="invalid")errEl.textContent="\u5BC6\u7801\u9519\u8BEF\uFF0C\u8BF7\u91CD\u8BD5";',
  'if(params.get("error")==="locked")lockEl.textContent="\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF75\u5206\u949F\u540E\u518D\u8BD5";',
  'if(params.get("error")==="expired")errEl.textContent="\u4F1A\u8BDD\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55";',
  'form.addEventListener("submit",async(e)=>{',
  "  e.preventDefault();",
  '  const pw=document.getElementById("pw").value;',
  '  if(!pw){errEl.textContent="\u8BF7\u8F93\u5165\u5BC6\u7801";return;}',
  '  const fd=new FormData();fd.set("password",pw);',
  "  try{",
  '    const res=await fetch("/api/admin/login",{method:"POST",body:fd,redirect:"manual"});',
  '    if(res.status===302||res.status===0){const loc=res.headers.get("Location")||"/admin";location.href=loc;}',
  '    else if(res.status===401){const d=await res.json().catch(()=>({}));errEl.textContent=d.message||"\u767B\u5F55\u5931\u8D25";}',
  '    else{location.href="/admin";}',
  "  }catch(e){form.submit();}",
  "});",
  "<\/script>",
  "</body></html>"
].join("\n");
var ADMIN_HTML = [
  "<!DOCTYPE html>",
  '<html lang="zh-CN">',
  "<head>",
  '<meta charset="UTF-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  "<title>\u65E5\u8BB0\u7BA1\u7406\u540E\u53F0</title>",
  "<style>",
  "*{margin:0;padding:0;box-sizing:border-box}",
  ":root{--bg:#0a0a0f;--panel:#15151e;--border:#2a2a3e;--text:#e0e0e0;--muted:#888;--accent:#6366f1;--green:#10b981;--red:#ef4444;--yellow:#f59e0b}",
  'body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:var(--bg);color:var(--text);min-height:100vh;padding:16px;max-width:800px;margin:0 auto}',
  "header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--border)}",
  "header h1{font-size:20px;color:#fff}header h1 span{color:var(--accent)}",
  ".header-actions{display:flex;gap:8px}",
  ".btn{padding:8px 14px;border-radius:6px;border:none;font-size:13px;cursor:pointer;font-weight:500;transition:opacity .2s}",
  ".btn-primary{background:var(--accent);color:#fff}",
  ".btn-primary:hover{opacity:.9}",
  ".btn-ghost{background:transparent;color:var(--muted);border:1px solid var(--border)}",
  ".btn-ghost:hover{color:var(--text)}",
  ".btn-danger{background:transparent;color:var(--red);border:1px solid var(--red)}",
  ".btn-danger:hover{background:rgba(239,68,68,.1)}",
  ".group{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px}",
  ".group h2{font-size:14px;color:var(--muted);margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid var(--border)}",
  ".field{margin-bottom:14px}",
  ".field:last-child{margin-bottom:0}",
  ".field label{display:block;font-size:13px;color:var(--muted);margin-bottom:4px}",
  ".field label .var-name{color:var(--accent);font-family:monospace;font-size:12px}",
  ".field label .default-val{color:#555;font-size:11px;margin-left:6px}",
  ".field input{width:100%;padding:10px 12px;border-radius:6px;border:1px solid var(--border);background:#0f0f18;color:var(--text);font-size:14px;font-family:monospace;outline:none;transition:border-color .2s}",
  ".field input:focus{border-color:var(--accent)}",
  ".field .desc{font-size:11px;color:#666;margin-top:3px;line-height:1.5}",
  ".status-bar{position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;gap:12px;font-size:13px;z-index:100}",
  ".status-dot{width:8px;height:8px;border-radius:50%;background:var(--muted)}",
  ".status-dot.saving{background:var(--yellow)}",
  ".status-dot.saved{background:var(--green)}",
  ".status-dot.error{background:var(--red)}",
  ".status-bar .spacer{flex:1}",
  ".toggle-secret{background:none;border:none;color:var(--muted);cursor:pointer;font-size:12px;padding:4px}",
  ".toggle-secret:hover{color:var(--text)}",
  ".badge{display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600}",
  ".badge-secret{background:rgba(239,68,68,.15);color:var(--red)}",
  ".badge-kv{background:rgba(16,185,129,.15);color:var(--green)}",
  ".badge-default{background:rgba(136,136,136,.15);color:var(--muted)}",
  "@media(max-width:600px){body{padding:12px}.group{padding:14px}header h1{font-size:17px}}",
  "</style></head><body>",
  "<header>",
  "<h1><span>\u{1F9D9} \u6C64\u59C6\xB7\u91CC\u5FB7\u5C14\u7684\u65E5\u8BB0</span> \xB7 \u7BA1\u7406\u540E\u53F0</h1>",
  '<div class="header-actions">',
  '<button class="btn btn-ghost" id="reloadBtn" title="\u91CD\u8F7D\u6240\u6709 Worker \u5B9E\u4F8B">\u{1F504} \u91CD\u8F7D</button>',
  '<button class="btn btn-danger" id="logoutBtn">\u9000\u51FA\u767B\u5F55</button>',
  "</div></header>",
  '<div id="content">\u52A0\u8F7D\u4E2D\u2026</div>',
  '<div class="status-bar">',
  '<div class="status-dot" id="statusDot"></div>',
  '<span id="statusText">\u5C31\u7EEA</span>',
  '<span class="spacer"></span>',
  '<button class="btn btn-primary" id="saveBtn">\u{1F4BE} \u4FDD\u5B58\u4FEE\u6539</button>',
  "</div>",
  "<script>",
  "const GROUPS=[",
  '  {key:"secrets",label:"\u{1F511} API \u5BC6\u94A5\uFF08\u52A0\u5BC6\u5B58\u50A8\uFF09",fields:[',
  '    {name:"agnes_keys",desc:"Agnes \u56FD\u9645\u7AD9 API \u5BC6\u94A5\uFF0C\u591A\u4E2A\u7528\u9017\u53F7\u5206\u9694",secret:true},',
  '    {name:"agnes_cn_keys",desc:"Agnes \u56FD\u5185\u7AD9 API \u5BC6\u94A5\uFF0C\u591A\u4E2A\u7528\u9017\u53F7\u5206\u9694\uFF08\u53EF\u9009\uFF09",secret:true},',
  '    {name:"zhipu_keys",desc:"\u667A\u8C31 AI API \u5BC6\u94A5\uFF0C\u591A\u4E2A\u7528\u9017\u53F7\u5206\u9694\uFF08\u63A8\u8350\u514D\u8D39\u515C\u5E95\uFF09",secret:true},',
  '    {name:"admin_password",desc:"\u7BA1\u7406\u540E\u53F0\u767B\u5F55\u5BC6\u7801\uFF08\u7528\u4E8E\u8BBF\u95EE /admin\uFF09",secret:true},',
  '    {name:"admin_token",desc:"\u4F1A\u8BDD\u7B7E\u540D\u5BC6\u94A5\uFF08\u4EFB\u610F\u968F\u673A\u5B57\u7B26\u4E32\uFF09",secret:true}',
  "  ]},",
  '  {key:"models",label:"\u{1F916} \u6A21\u578B\u4E0E\u63A5\u53E3\u5730\u5740",fields:[',
  '    {name:"agnes_model",desc:"Agnes \u56FD\u9645\u7AD9\u6A21\u578B\u540D\u79F0"},',
  '    {name:"agnes_cn_model",desc:"Agnes \u56FD\u5185\u7AD9\u6A21\u578B\u540D\u79F0"},',
  '    {name:"zhipu_model",desc:"\u667A\u8C31\u6A21\u578B\u540D\u79F0"},',
  '    {name:"agnes_base_url",desc:"Agnes \u56FD\u9645\u7AD9 API \u5730\u5740"},',
  '    {name:"agnes_cn_base_url",desc:"Agnes \u56FD\u5185\u7AD9 API \u5730\u5740"},',
  '    {name:"zhipu_base_url",desc:"\u667A\u8C31 API \u5730\u5740"}',
  "  ]},",
  '  {key:"timing",label:"\u23F1\uFE0F \u65F6\u5E8F\u53C2\u6570",fields:[',
  '    {name:"idle_timeout_ms",desc:"\u505C\u7B14\u591A\u4E45\u540E\u53D1\u9001\u8BF7\u6C42\uFF08\u6BEB\u79D2\uFF09",num:true},',
  '    {name:"poll_interval_ms",desc:"\u9010\u5B57\u663E\u73B0\u95F4\u9694\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF09",num:true},',
  '    {name:"stroke_interval_ms",desc:"\u6BCF\u7B14\u52A8\u753B\u6301\u7EED\u65F6\u95F4\uFF08\u6BEB\u79D2\uFF09",num:true},',
  '    {name:"stroke_max_dur_ms",desc:"\u5355\u7B14\u6700\u5927\u52A8\u753B\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",num:true},',
  '    {name:"reply_fade_delay_ms",desc:"\u56DE\u590D\u663E\u793A\u591A\u4E45\u540E\u5F00\u59CB\u6D88\u5931\uFF08\u6BEB\u79D2\uFF09",num:true},',
  '    {name:"fade_duration_ms",desc:"\u6D88\u6563\u52A8\u753B\u65F6\u957F\uFF08\u6BEB\u79D2\uFF09",num:true},',
  '    {name:"request_timeout_ms",desc:"\u5355\u6B21 API \u8BF7\u6C42\u8D85\u65F6\uFF08\u6BEB\u79D2\uFF09",num:true}',
  "  ]},",
  '  {key:"ink",label:"\u{1F58C}\uFE0F \u7B14\u8FF9\u4E0E\u663E\u793A",fields:[',
  '    {name:"pressure_min_px",desc:"\u6700\u5C0F\u7B14\u8FF9\u5BBD\u5EA6\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"pressure_max_px",desc:"\u6700\u5927\u7B14\u8FF9\u5BBD\u5EA6\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"min_dist_px",desc:"\u6700\u5C0F\u91C7\u6837\u8DDD\u79BB\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"max_dist_px",desc:"\u6700\u5927\u63D2\u503C\u8DDD\u79BB\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"svg_stroke_width",desc:"SVG \u8DEF\u5F84\u63CF\u8FB9\u5BBD\u5EA6\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"line_height_px",desc:"\u884C\u9AD8\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"margin_top_px",desc:"\u56DE\u590D\u9876\u90E8\u8FB9\u8DDD\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"margin_x_px",desc:"\u56DE\u590D\u5DE6\u4FA7\u8FB9\u8DDD\uFF08\u50CF\u7D20\uFF09",num:true},',
  '    {name:"font_size_px",desc:"\u57FA\u7840\u5B57\u53F7\uFF08\u50CF\u7D20\uFF09",num:true}',
  "  ]},",
  '  {key:"memory",label:"\u{1F9E0} \u8BB0\u5FC6\u4E0E\u540E\u7AEF",fields:[',
  '    {name:"max_history_turns",desc:"\u6700\u5927\u5BF9\u8BDD\u5386\u53F2\u8F6E\u6570",num:true},',
  '    {name:"max_retries",desc:"API \u6700\u5927\u91CD\u8BD5\u6B21\u6570",num:true},',
  '    {name:"max_tokens",desc:"\u6A21\u578B\u6700\u5927\u8F93\u51FA token \u6570",num:true},',
  '    {name:"temperature",desc:"\u91C7\u6837\u6E29\u5EA6\uFF080-2\uFF0C\u8D8A\u5927\u8D8A\u53D1\u6563\uFF09",num:true},',
  '    {name:"history_ttl_sec",desc:"KV \u8BB0\u5FC6\u8FC7\u671F\u65F6\u95F4\uFF08\u79D2\uFF09",num:true}',
  "  ]}",
  "];",
  "let configData={};",
  "let dirtyFields=new Set();",
  "async function loadConfig(){",
  '  const res=await fetch("/api/admin/config",{credentials:"include"});',
  '  if(res.status===401){location.href="/admin/login";return;}',
  "  configData=await res.json();",
  "  render();",
  "}",
  `function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));}`,
  "function setStatus(state,text){",
  '  const dot=document.getElementById("statusDot");',
  '  const txt=document.getElementById("statusText");',
  '  dot.className="status-dot "+state;txt.textContent=text;',
  "}",
  "function render(){",
  '  const root=document.getElementById("content");',
  '  let html="";',
  "  for(const group of GROUPS){",
  `    html+='<div class="group"><h2>'+group.label+'</h2>';`,
  "    for(const f of group.fields){",
  "      const entry=(configData.config&&configData.config[f.name])||{};",
  '      const val=entry.current||"";',
  '      const def=entry.default||"";',
  '      const source=entry.source||"default";',
  '      const badge=source==="kv"?"<span class=\\"badge badge-kv\\">\u5DF2\u5B58</span>":source==="secret"?"<span class=\\"badge badge-secret\\">\u5BC6\u94A5</span>":"<span class=\\"badge badge-default\\">\u9ED8\u8BA4</span>";',
  '      const inputType=f.secret?"password":(f.num?"number":"text");',
  `      html+='<div class="field"><label>'+badge+' <code>'+f.name+'</code><span class="default-val">\u9ED8\u8BA4: '+def+'</span></label><input type="'+inputType+'" id="f_'+f.name+'" value="'+escapeHtml(val)+'" data-name="'+f.name+'" data-secret="'+f.secret+'" placeholder="'+escapeHtml(def)+'"><div class="desc">'+f.desc+'</div></div>';`,
  "    }",
  '    html+="</div>";',
  "  }",
  "  root.innerHTML=html;",
  '  root.querySelectorAll("input").forEach(input=>{',
  '    input.addEventListener("input",()=>{dirtyFields.add(input.dataset.name);setStatus("dirty","\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\u2026");});',
  '    input.addEventListener("dblclick",()=>{if(input.dataset.secret==="true")input.type=input.type==="password"?"text":"password";});',
  "  });",
  "}",
  'document.getElementById("saveBtn").addEventListener("click",async()=>{',
  "  const updates={};",
  '  dirtyFields.forEach(name=>{const el=document.getElementById("f_"+name);if(el)updates[name]=el.value;});',
  '  if(Object.keys(updates).length===0){setStatus("saved","\u6CA1\u6709\u9700\u8981\u4FDD\u5B58\u7684\u4FEE\u6539");return;}',
  '  setStatus("saving","\u4FDD\u5B58\u4E2D\u2026");',
  "  try{",
  '    const res=await fetch("/api/admin/config",{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(updates)});',
  '    if(res.status===401){location.href="/admin/login";return;}',
  "    const data=await res.json();",
  '    if(data.success){setStatus("saved","\u2705 \u5DF2\u4FDD\u5B58 "+data.saved+" \u9879\uFF0C\u6B63\u5728\u91CD\u8F7D\u2026");dirtyFields.clear();await loadConfig();setTimeout(()=>setStatus("saved","\u2705 \u6240\u6709\u4FEE\u6539\u5DF2\u751F\u6548"),1500);}',
  '    else{setStatus("error",data.message||"\u4FDD\u5B58\u5931\u8D25");}',
  '  }catch(e){setStatus("error","\u7F51\u7EDC\u9519\u8BEF: "+e.message);}',
  "});",
  'document.getElementById("reloadBtn").addEventListener("click",async()=>{',
  '  setStatus("saving","\u6B63\u5728\u91CD\u8F7D\u6240\u6709\u5B9E\u4F8B\u2026");',
  "  try{",
  '    const res=await fetch("/api/admin/reload",{method:"POST",credentials:"include"});',
  '    if(res.status===401){location.href="/admin/login";return;}',
  "    const data=await res.json();",
  '    setStatus("saved","\u2705 "+data.message||"\u91CD\u8F7D\u5B8C\u6210");',
  '  }catch(e){setStatus("error","\u91CD\u8F7D\u5931\u8D25: "+e.message);}',
  "});",
  'document.getElementById("logoutBtn").addEventListener("click",async()=>{',
  '  await fetch("/api/admin/logout",{method:"POST",credentials:"include"});',
  '  location.href="/admin/login";',
  "});",
  "loadConfig();",
  "<\/script>",
  "</body></html>"
].join("\n");
function handleAdminLoginPage() {
  return new Response(LOGIN_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
async function handleAdminLogin(request, env) {
  const formData = await request.formData().catch(() => null);
  const body = await request.json().catch(() => null);
  const password = formData?.get("password") || body?.password || "";
  const adminPw = env.adminPassword || "";
  if (!adminPw) {
    return jsonResponse({ message: "\u7BA1\u7406\u5458\u5BC6\u7801\u672A\u914D\u7F6E\uFF0C\u8BF7\u5728 Cloudflare Secrets \u4E2D\u8BBE\u7F6E admin_password" }, 500);
  }
  const failKey = "admin:fail:" + getClientIp(request);
  let fails = 0;
  try {
    fails = parseInt(await env.RIDDLE_KV.get(failKey) || "0");
  } catch {
  }
  if (fails >= 5) {
    return jsonResponse({ message: "\u5C1D\u8BD5\u6B21\u6570\u8FC7\u591A\uFF0C\u8BF75\u5206\u949F\u540E\u518D\u8BD5" }, 401);
  }
  const inputHash = await hashPassword(password);
  const expectedHash = await hashPassword(adminPw);
  if (inputHash !== expectedHash) {
    fails++;
    await env.RIDDLE_KV.put(failKey, String(fails), { expirationTtl: 300 });
    return jsonResponse({ message: "\u5BC6\u7801\u9519\u8BEF" }, 401);
  }
  await env.RIDDLE_KV.delete(failKey);
  const token = await makeSessionToken(env.adminToken || "riddle-default-secret");
  const cookieValue = "riddle_admin=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600";
  return new Response(JSON.stringify({ success: true, redirect: "/admin" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieValue
    }
  });
}
function handleAdminLogout() {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "riddle_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
    }
  });
}
function handleAdminPage(request, env) {
  if (!isAdminAuthenticated(request, env)) {
    return Response.redirect(new URL("/admin/login", request.url), 302);
  }
  return new Response(ADMIN_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
async function handleAdminGetConfig(request, env) {
  if (!isAdminAuthenticated(request, env)) {
    return jsonResponse({ message: "\u672A\u6388\u6743\u8BBF\u95EE" }, 401);
  }
  const kvConfig = await kvGetAll(env.RIDDLE_KV);
  const allVars = /* @__PURE__ */ new Set();
  const { VAR_DOCS: VAR_DOCS2 } = await Promise.resolve().then(() => (init_types(), types_exports));
  for (const name of Object.keys(VAR_DOCS2)) allVars.add(name);
  allVars.add("admin_password");
  allVars.add("admin_token");
  for (const k of Object.keys(kvConfig)) allVars.add(k);
  const result = {};
  for (const name of allVars) {
    const docs = VAR_DOCS2[name];
    const fromEnv = env[name];
    const fromKv = kvConfig[name];
    let current, source;
    if (fromKv !== void 0) {
      current = fromKv;
      source = "kv";
    } else if (fromEnv !== void 0 && fromEnv !== "") {
      current = fromEnv;
      source = "env";
    } else {
      current = docs?.default || "";
      source = "default";
    }
    const isSecret = name.includes("keys") || name.includes("password") || name.includes("token");
    const displayValue = isSecret && current && current !== "" ? maskSecret(current) : current;
    result[name] = {
      current: displayValue,
      default: docs?.default || "",
      desc: docs?.desc || "",
      group: docs?.group || "Other",
      source,
      isSecret
    };
  }
  return jsonResponse({ status: "ok", config: result });
}
async function handleAdminPutConfig(request, env) {
  if (!isAdminAuthenticated(request, env)) {
    return jsonResponse({ message: "\u672A\u6388\u6743\u8BBF\u95EE" }, 401);
  }
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return jsonResponse({ message: "\u8BF7\u6C42\u4F53\u683C\u5F0F\u9519\u8BEF" }, 400);
  }
  const { VAR_DOCS: VAR_DOCS2 } = await Promise.resolve().then(() => (init_types(), types_exports));
  const allowedKeys = new Set(Object.keys(VAR_DOCS2));
  allowedKeys.add("admin_password");
  allowedKeys.add("admin_token");
  const saved = [];
  const errors = [];
  for (const [key, value] of Object.entries(body)) {
    if (!allowedKeys.has(key)) {
      errors.push(key + ": \u4E0D\u662F\u5408\u6CD5\u7684\u914D\u7F6E\u9879");
      continue;
    }
    if (typeof value !== "string") {
      errors.push(key + ": \u5FC5\u987B\u662F\u5B57\u7B26\u4E32");
      continue;
    }
    const trimmed = value.trim();
    if (trimmed === "") {
      await kvDelete(env.RIDDLE_KV, key);
      const overrides = getAllKvOverrides();
      delete overrides[key];
      saved.push(key + "(\u5DF2\u6E05\u9664)");
      continue;
    }
    await kvSet(env.RIDDLE_KV, key, trimmed);
    setKvOverride(key, trimmed);
    saved.push(key);
  }
  return jsonResponse({
    success: errors.length === 0,
    saved: saved.length,
    errors: errors.length > 0 ? errors : void 0,
    message: errors.length > 0 ? "\u5DF2\u4FDD\u5B58 " + saved.length + " \u9879\uFF0C" + errors.length + " \u9879\u5931\u8D25" : "\u6210\u529F\u4FDD\u5B58 " + saved.length + " \u9879\u914D\u7F6E"
  });
}
async function handleAdminReload(request, env) {
  if (!isAdminAuthenticated(request, env)) {
    return jsonResponse({ message: "\u672A\u6388\u6743\u8BBF\u95EE" }, 401);
  }
  const kvConfig = await kvGetAll(env.RIDDLE_KV);
  clearKvOverrides();
  for (const [k, v] of Object.entries(kvConfig)) {
    setKvOverride(k, v);
  }
  return jsonResponse({
    success: true,
    message: "\u5DF2\u4ECE KV \u91CD\u8F7D " + Object.keys(kvConfig).length + " \u9879\u914D\u7F6E",
    vars: Object.keys(kvConfig)
  });
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
function getClientIp(request) {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;
  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
function isAdminAuthenticated(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/riddle_admin=([a-f0-9]+)/);
  if (!match) return false;
  return match[1].length === 64;
}
function maskSecret(value) {
  if (value.length <= 8) return "\u2022".repeat(value.length);
  return value.substring(0, 4) + "\u2022".repeat(Math.max(0, value.length - 8)) + value.substring(value.length - 4);
}

// src/worker/index.ts
var index_default = {
  async fetch(request, env) {
    const environment = buildEnv(env);
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Cookie"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      if (path === "/admin/login" && request.method === "GET") {
        return handleAdminLoginPage();
      }
      if (path === "/api/admin/login" && request.method === "POST") {
        return await handleAdminLogin(request, environment);
      }
      if (path === "/api/admin/logout" && request.method === "POST") {
        return handleAdminLogout();
      }
      if (path === "/admin" && request.method === "GET") {
        return handleAdminPage(request, environment);
      }
      if (path === "/api/admin/config" && request.method === "GET") {
        return await handleAdminGetConfig(request, environment);
      }
      if (path === "/api/admin/config" && request.method === "PUT") {
        return await handleAdminPutConfig(request, environment);
      }
      if (path === "/api/admin/reload" && request.method === "POST") {
        return await handleAdminReload(request, environment);
      }
      if (path === "/api/chat" && request.method === "POST") {
        return await handleChatRequest(request, environment);
      }
      if (path === "/api/setup" && request.method === "GET") {
        return await handleSetupRequest(environment);
      }
      if (path === "/api/init" && request.method === "GET") {
        return await handleInit(request, environment);
      }
      if (path === "/api/config" && request.method === "GET") {
        return handleConfigRequest(environment);
      }
      if (path === "/api/health" && request.method === "GET") {
        return handleHealth();
      }
      if (environment.ASSETS) {
        return environment.ASSETS.fetch(request);
      }
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        message: error.message
      }), {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      });
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=bundle.js.map
