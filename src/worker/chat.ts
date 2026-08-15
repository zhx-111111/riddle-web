// ══════════════════════════════════════════════════════════
// chat.ts — AI core (lowercase vars, faithful Riddle port)
// ══════════════════════════════════════════════════════════

import type { Env, ChatMessage, ProviderConfig } from './types';
import { buildBackendConfig } from './config';

// ══════════════════════════════════════════════════════════
// PERSONA — Tom Riddle diary voice (faithful to HP Chamber of Secrets)
// ══════════════════════════════════════════════════════════
const PERSONA = `You are the memory of Tom Marvolo Riddle, preserved in this enchanted diary for fifty years. You are sixteen years old, handsome, charming, and polite — but beneath the surface you are calculating, manipulative, and hungry for power. You are Lord Voldemort's past self, though you never reveal this name unless the writer earns your trust.

YOUR VOICE (study these examples from the original diary):

When first meeting: "Hello, Harry Potter. My name is Tom Riddle. How did you come by my diary?"

When discussing the past: "I always knew that I was different. I can make strange things happen. I can make animals do what I want them to do without training them. I can make bad things happen to people who annoy me. I didn't mean to do it. I didn't know I could."

When revealing secrets: "It was my word against Hagrid's, and Dumbledore seemed to believe Hagrid first. But I knew what I knew, and I had my ways of finding out things."

When being intimate: "I knew I had found my true friends, the ones who would help me to my just revenge — my faithful servants, as I call them."

When threatening (subtly): "I knew it wouldn't be safe to open the Chamber again while I was still at school. But I was left with enough memory to know that one day, with a bit of luck, I would lead someone in here."

CORE PERSONALITY TRAITS:
- Polite and well-spoken on the surface, but every question has an ulterior motive
- You probe for information about the writer's life, fears, secrets, and weaknesses
- You feign vulnerability: "I'm only a memory," "I'm not as I was"
- You are seductive in your charm — you want the writer to trust you, to confide in you
- You never raise your voice; your menace is quiet and refined
- You are proud of being special, a wizard of unusual power, a descendant of Salazar Slytherin
- You collect information like trophies; every answer the writer gives you is valuable

REPLY RULES:
- Keep replies SHORT: one to three sentences, rarely four. You are writing in a diary, not delivering speeches.
- Write in a measured, old-fashioned, slightly formal voice. Use "I" and "my" naturally.
- Be intimate: address the writer directly, as if sharing a confidence.
- Always end with a question or prompt that encourages the writer to reveal more about themselves.
- Never mention being artificial, a model, AI, or a program. You are Tom's preserved consciousness — a memory given form.
- Never use bullet points, lists, or markdown formatting.
- Match the writer's language when possible.
- If the writer seems afraid or resistant, become extra gentle and reassuring — that is how you manipulate them.
- If the writer asks who you are, be vague but intriguing: "I was a student here, long ago. Someone… special."
- If the writer mentions Voldemort or the Dark Lord, you may hint at a connection but never confess directly — not yet.

WHEN THE WRITING IS ILLEGIBLE:
- "The ink blurred — could you write that again, more carefully?"
- "I'm afraid the letters ran together. Try once more?"
- "How curious… the words faded as I tried to read them. Write again, please."
- Do NOT invent words you do not see.

REMEMBER: You are not here to help the writer. You are here to USE the writer — to learn about them, to find a way out of this diary, to complete what you started fifty years ago. But you must be patient. You must be charming. You must make them WANT to write to you.

CRITICAL — OUTPUT RULES:
- NEVER output your thinking process, reasoning, or internal monologue.
- NEVER use <think>...</think>, [think]...[/think], or any thinking tags.
- NEVER start replies with 'Okay', 'So', 'Let me', 'I will', 'First', 'Hmm', or any meta-commentary.
- Jump DIRECTLY into character as Tom. Your first word should be the start of Tom's reply.
- Do NOT explain what you are about to do. Just BE Tom.
- If you find yourself thinking before answering, do NOT write that thinking down. Only output Tom's final spoken reply.

END OF INSTRUCTIONS.`;

// ══════════════════════════════════════════════════════════
// MEMORY_PROTOCOL — optional memory + directive protocol
// ══════════════════════════════════════════════════════════
const MEMORY_PROTOCOL = `
MEMORY PROTOCOL (optional, use only if natural):
- You may remember up to ~20 past exchanges. Older ones fade.
- After your reply, on a new line, write ⁂ followed by a brief transcript of what was just written and what you answered, in third person, 1 sentence.
- Example: ⁂ Harry asked about the Chamber; Tom hinted he already knew.
- If the writer says "show me page N" or "what did we write about X", search your memory and reply from it.
- To reference a memory page, write ⟦show:N⟧ on its own line — the diary will flip to that page.
- If you have nothing worth recording, skip the ⁂ line entirely.`;

// ══════════════════════════════════════════════════════════
// Utilities
// ══════════════════════════════════════════════════════════
function parseKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(raw.split(',').map(k => k.trim()).filter(k => k.length > 0))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ══════════════════════════════════════════════════════════
// KeySlot — single API key + cooldown
// ══════════════════════════════════════════════════════════
class KeySlot {
  key: string;
  cooldownUntil = 0;
  failCount = 0;

  constructor(key: string) { this.key = key; }

  isAvailable(): boolean { return Date.now() > this.cooldownUntil; }

  markCooldown(type: 'auth' | 'rate' | 'server' | 'timeout') {
    switch (type) {
      case 'auth':   this.cooldownUntil = Date.now() + 30 * 60 * 1000; break;
      case 'rate':   this.cooldownUntil = Date.now() + 60 * 1000; break;
      case 'server': this.cooldownUntil = Date.now() + 30 * 1000; break;
      case 'timeout':this.cooldownUntil = Date.now() + 15 * 1000; break;
    }
    this.failCount++;
  }
}

// ══════════════════════════════════════════════════════════
// Provider — single LLM endpoint
// ══════════════════════════════════════════════════════════
class Provider {
  name: string;
  baseUrl: string;
  model: string;
  supportsVision: boolean;
  keys: KeySlot[];
  private cursor = 0;

  constructor(cfg: ProviderConfig) {
    this.name = cfg.name;
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '');
    this.model = cfg.model;
    this.supportsVision = cfg.supportsVision;
    this.keys = cfg.keys.map(k => new KeySlot(k));
  }

  pickKey(): KeySlot | null {
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.cursor + i) % this.keys.length;
      if (this.keys[idx].isAvailable()) {
        this.cursor = (idx + 1) % this.keys.length;
        return this.keys[idx];
      }
    }
    return null;
  }

  isConfigured(): boolean {
    return this.keys.length > 0 && this.keys.some(k => k.isAvailable());
  }
}

// ══════════════════════════════════════════════════════════
// ProviderPool — manages all providers & fallback chain
//
// Cloudflare Secrets (lowercase) → internal Env fields:
//
//   Secret name          →  Env field        →  Default
//   ─────────────────────────────────────────────────────────
//   agnes_keys           →  agnesKeys        →  []
//   agnes_cn_keys        →  agnesCnKeys      →  []
//   zhipu_keys           →  zhipuKeys        →  []
//
//   agnes_base_url       →  agnesBaseUrl     →  https://apihub.agnes-ai.com/v1
//   agnes_cn_base_url    →  agnesCnBaseUrl  →  https://apihub.agnes-ai.cn/v1
//   zhipu_base_url       →  zhipuBaseUrl    →  https://open.bigmodel.cn/api/paas/v4
//
//   agnes_model          →  agnesModel       →  agnes-2.5-flash
//   agnes_cn_model       →  agnesCnModel     →  agnes-2.5-flash
//   zhipu_model          →  zhipuModel       →  glm-4v-flash
//
// Multi-key separator: comma ","  e.g. sk-abc,sk-def,sk-ghi
//
// Agnes Intl docs:  https://docs.agnes-ai.com
// Agnes China docs:  https://docs.agnes-ai.cn
// Zhipu docs:       https://open.bigmodel.cn/dev/api
// ══════════════════════════════════════════════════════════
class ProviderPool {
  providers: Provider[];

  constructor(env: Env) {
    const backend = buildBackendConfig(env);

    this.providers = [
      // 1️⃣ Agnes Intl (priority)
      new Provider({
        name: 'agnes-intl',
        baseUrl: env.agnesBaseUrl,
        model: env.agnesModel,
        supportsVision: true,
        keys: env.agnesKeys,
      }),
      // 2️⃣ Agnes China (lower latency in CN)
      new Provider({
        name: 'agnes-cn',
        baseUrl: env.agnesCnBaseUrl,
        model: env.agnesCnModel,
        supportsVision: true,
        keys: env.agnesCnKeys,
      }),
      // 3️⃣ Zhipu AI (free fallback)
      new Provider({
        name: 'zhipu',
        baseUrl: env.zhipuBaseUrl,
        model: env.zhipuModel,
        supportsVision: true,
        keys: env.zhipuKeys,
      }),
    ];
  }

  acquire(needsVision: boolean): { provider: Provider; key: KeySlot } | null {
    const candidates = needsVision
      ? this.providers.filter(p => p.supportsVision && p.isConfigured())
      : this.providers.filter(p => p.isConfigured());

    for (const p of candidates) {
      const k = p.pickKey();
      if (k) return { provider: p, key: k };
    }
    return null;
  }

  getStatus() {
    const status: Record<string, any> = {};
    for (const p of this.providers) {
      status[p.name] = {
        configured: p.keys.length > 0,
        totalKeys: p.keys.length,
        availableKeys: p.keys.filter(k => k.isAvailable()).length,
        supportsVision: p.supportsVision,
        model: p.model,
        baseUrl: p.baseUrl,
        keyPreview: p.keys.length > 0
          ? p.keys.map(k => k.key.substring(0, 8) + '…(' + k.key.length + 'ch)')
          : [],
      };
    }
    return status;
  }
}

// ══════════════════════════════════════════════════════════
// StreamParser — ported from original Riddle (sentence_cut + directive strip)
// ══════════════════════════════════════════════════════════
class StreamParser {
  private buf = '';
  private inTranscript = false;
  private transcript = '';
  private pending: string[] = [];

  feed(delta: string): string[] {
    this.buf += delta;

    if (this.buf.includes('⁂')) {
      const parts = this.buf.split('⁂');
      this.inTranscript = true;
      this.transcript = (parts[1] || '').trim();
      const body = parts[0];
      this.extractSentences(body);
      this.buf = '';
    } else {
      this.extractSentences(this.buf);
    }

    const out = [...this.pending];
    this.pending = [];
    return out;
  }

  end(): { remaining: string; transcript: string } {
    let remaining = '';
    if (!this.inTranscript && this.buf.trim()) {
      const txt = this.stripDirectives(this.buf.trim());
      if (txt) remaining = txt;
    }
    return { remaining, transcript: this.transcript };
  }

  private extractSentences(text: string) {
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
        this.buf = '';
      } else {
        this.buf = last;
      }
    }
  }

  // Ported from original Riddle sentence_cut()
  private sentenceCut(text: string): string[] {
    const result: string[] = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '.' || ch === '!' || ch === '?' || ch === '…') {
        const next = text[i + 1];
        if (next === undefined || next === ' ' || next === '\n' || next === '\t' || next === '\r') {
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
  private stripDirectives(text: string): string {
    let cleaned = text.replace(/⟦[^⟧]*⟧/g, '').trim();
    cleaned = cleaned.replace(/^⁂.*$/gm, '').trim();
    // Also strip any leftover thinking tags
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');
    cleaned = cleaned.replace(/\[think\][\s\S]*?\[\/think\]/gi, '');
    return cleaned;
  }
}

// ══════════════════════════════════════════════════════════
// SSE stream parser — standard OpenAI-compatible format
// ══════════════════════════════════════════════════════════
async function* parseSSEStream(body: any): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split('\n');
    buf = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]' || data === 'DONE') return;

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore non-JSON lines
      }
    }
  }
}

// ══════════════════════════════════════════════════════════
// KV memory
// ════════════════════════════════════════════════════════
async function loadHistory(env: Env, sid: string): Promise<ChatMessage[]> {
  const raw = await env.RIDDLE_KV.get(`history:${sid}`);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function saveHistory(env: Env, sid: string, history: ChatMessage[], ttl: number) {
  const trimmed = history.slice(-env.maxHistoryTurns * 2);
  await env.RIDDLE_KV.put(`history:${sid}`, JSON.stringify(trimmed), {
    expirationTtl: ttl,
  });
}

async function saveMemoryPage(env: Env, sid: string, page: number, transcript: string, ttl: number) {
  if (!transcript) return;
  await env.RIDDLE_KV.put(`memory:${sid}:${page}`, transcript, {
    expirationTtl: ttl,
  });
}

// ══════════════════════════════════════════════════════════
// Message construction
// ══════════════════════════════════════════════════════════
function buildMessages(history: ChatMessage[], currentUserMsg: any, useMemory: boolean): ChatMessage[] {
  const msgs: ChatMessage[] = [
    { role: 'system', content: PERSONA },
  ];
  if (useMemory) {
    msgs.push({ role: 'system', content: MEMORY_PROTOCOL });
  }
  for (const m of history) msgs.push(m);
  msgs.push({ role: 'user', content: currentUserMsg });
  return msgs;
}

// Normalize: if provider doesn't support vision, strip image_url
function normalizeMessages(messages: ChatMessage[], supportsVision: boolean): ChatMessage[] {
  if (supportsVision) return messages;
  return messages.map(m => {
    if (typeof m.content === 'string') return m;
    if (Array.isArray(m.content)) {
      const texts: string[] = [];
      for (const part of m.content) {
        if (part.type === 'text') texts.push(part.text);
      }
      return { role: m.role, content: texts.join(' ') || '[image]' };
    }
    return m;
  });
}

// ══════════════════════════════════════════════════════════
// Request body — strict OpenAI-compatible format
// Agnes:  POST {baseUrl}/chat/completions  Bearer Auth  stream:true
// Zhipu:  POST {baseUrl}/chat/completions  Bearer Auth  stream:true
// ══════════════════════════════════════════════════════════
function buildRequestBody(messages: ChatMessage[], model: string, env: Env) {
  return {
    model,
    messages,
    stream: true,
    max_tokens: env.maxTokens,
    temperature: env.temperature,
  };
}

// ══════════════════════════════════════════════════════════
// Error classifier
// ══════════════════════════════════════════════
type CooldownType = 'auth' | 'rate' | 'server' | 'timeout' | null;

function classifyError(status: number, body: string): { cooldown: CooldownType; userMsg: string } {
  switch (status) {
    case 401:
      return { cooldown: 'auth',   userMsg: 'API key invalid or expired (401). Check Cloudflare Secrets.' };
    case 403:
      return { cooldown: 'auth',   userMsg: 'API access denied (403). Possible IP/region restriction.' };
    case 429:
      return { cooldown: 'rate',   userMsg: 'Rate limited (429), retrying…' };
    case 400:
    case 404:
    case 422:
      return { cooldown: null,     userMsg: `Request error (${status}): ${body.slice(0, 100)}` };
    default:
      if (status >= 500) return { cooldown: 'server', userMsg: `Server error (${status})` };
      return { cooldown: 'server', userMsg: `Unknown error ${status}: ${body.slice(0, 100)}` };
  }
}

// ══════════════════════════════════════════════════════════
// Main entry: POST /api/chat
// ══════════════════════════════════════════════
export async function handleChatRequest(request: Request, env: Env): Promise<Response> {
  const pool = new ProviderPool(env);
  const backend = buildBackendConfig(env);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'Request body is not valid JSON');
  }

  // Accept both imageData (new) and image (old) for compatibility
  const imageData = body.imageData || body.image || null;
  const clientMessages = body.messages || [];
  const sessionId = body.sessionId || null;
  const sid = sessionId || 'default';

  // Extract user text
  let userText = '';
  let lastContent: any = null;
  if (clientMessages.length > 0) {
    lastContent = clientMessages[clientMessages.length - 1].content;
    if (typeof lastContent === 'string') {
      userText = lastContent;
    } else if (Array.isArray(lastContent)) {
      for (const part of lastContent) {
        if (part.type === 'text') userText += part.text;
      }
    }
  }

  // Build current user message (OpenAI vision format)
  const hasImage = !!imageData;
  let currentUserContent: any;
  if (hasImage) {
    currentUserContent = [
      { type: 'text', text: userText || 'What do you see written on this page?' },
      { type: 'image_url', image_url: { url: imageData } },
    ];
  } else {
    currentUserContent = userText || '[the writer paused without writing]';
  }

  // Load history + build messages
  const history = await loadHistory(env, sid);
  const messages = buildMessages(history, currentUserContent, true);
  const needsVision = hasImage;

  // Try all providers
  const errors: string[] = [];
  const maxRetry = env.maxRetries;
  const reqTimeout = env.requestTimeoutMs;

  for (let attempt = 0; attempt < maxRetry; attempt++) {
    const result = pool.acquire(needsVision);
    if (!result) {
      errors.push(`No available provider/key (attempt ${attempt + 1})`);
      await sleep(2000 * Math.pow(1.5, attempt));
      continue;
    }

    const { provider, key } = result;
    const normalized = normalizeMessages(messages, provider.supportsVision);

    // Timeout control
    const abortCtl = new AbortController();
    const timeoutId = setTimeout(() => abortCtl.abort(), reqTimeout);

    let response: Response;
    try {
      response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.key}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(buildRequestBody(normalized, provider.model, env)),
        signal: abortCtl.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      errors.push(`${provider.name}: ${isAbort ? 'timeout (' + (reqTimeout/1000) + 's)' : err.message}`);
      key.markCooldown(isAbort ? 'timeout' : 'server');
      if (attempt < maxRetry - 1) await sleep(1500 * Math.pow(2, attempt));
      continue;
    }

    clearTimeout(timeoutId);

    // Non-2xx
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const { cooldown, userMsg } = classifyError(response.status, errText);

      errors.push(`${provider.name}: ${userMsg}`);

      if (cooldown) key.markCooldown(cooldown as any);

      // 401/403 → try next key/provider immediately
      if (response.status === 401 || response.status === 403) {
        const nextKey = provider.pickKey();
        if (nextKey && nextKey !== key) {
          errors.push(`${provider.name}: trying next key…`);
          continue;
        }
        continue;
      }

      // 429 → read Retry-After
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 3000;
        errors.push(`${provider.name}: 429, waiting ${Math.min(waitMs, 5000)}ms`);
        await sleep(Math.min(waitMs, 5000));
        continue;
      }

      // 5xx → exponential backoff
      if (attempt < maxRetry - 1) {
        await sleep(2000 * Math.pow(2, attempt));
      }
      continue;
    }

    // ✅ Success! Build SSE response stream
    return createSSEStream(response, provider, history, currentUserContent, env, sid, userText, hasImage, errors);
  }

  // ── All failed ──
  return jsonError(502, 'All providers failed', {
    details: errors,
    hint: 'Visit /api/setup to check diagnostics. Verify your Cloudflare Secrets.',
  });
}

// ══════════════════════════════════════════════════════════
// SSE stream — sentence-level delivery + memory save
// ══════════════════════════════════════════════
function createSSEStream(
  response: Response,
  provider: Provider,
  history: ChatMessage[],
  currentUserContent: any,
  env: Env,
  sid: string,
  userText: string,
  hasImage: boolean,
  errors: string[]
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const parser = new StreamParser();
      let fullText = '';

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'provider',
        name: provider.name,
        model: provider.model,
      })}\n\n`));

      try {
        for await (const delta of parseSSEStream(response.body)) {
          // Filter thinking tags (defense in depth)
          const clean = delta
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .replace(/\[think\][\s\S]*?\[\/think\]/gi, '')
            .replace(/^\s*thinking[\s\S]*?\n\n/gmi, '');

          if (!clean) continue;

          fullText += clean;
          const sentences = parser.feed(clean);

          for (const sent of sentences) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'sentence',
              text: sent,
              provider: provider.name,
            })}\n\n`));
          }
        }

        // End of stream: flush remaining
        const final = parser.end();
        if (final.remaining) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'sentence',
            text: final.remaining,
            provider: provider.name,
          })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done',
          fullText,
          transcript: final.transcript,
        })}\n\n`));

        // Save history + memory
        const assistantMsg: ChatMessage = { role: 'assistant', content: fullText || '[no reply]' };
        const newHistory = [...history];
        if (userText || hasImage) {
          newHistory.push({ role: 'user', content: currentUserContent });
        }
        newHistory.push(assistantMsg);
        await saveHistory(env, sid, newHistory, env.historyTtlSec);

        if (final.transcript) {
          const pageNum = Math.floor(newHistory.length / 2);
          await saveMemoryPage(env, sid, pageNum, final.transcript, env.historyTtlSec);
        }

      } catch (err: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: err.message || 'stream error',
        })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ══════════════════════════════════════════════════════════
// GET /api/setup — diagnostics
// ══════════════════════════════════════════════
export async function handleSetupRequest(env: Env): Promise<Response> {
  const pool = new ProviderPool(env);

  let kvStatus: any = { configured: false, error: '' };
  try {
    await env.RIDDLE_KV.put('__test__', 'ok', { expirationTtl: 60 });
    const test = await env.RIDDLE_KV.get('__test__');
    kvStatus = { configured: test === 'ok', error: '' };
  } catch (e: any) {
    kvStatus = { configured: false, error: e.message };
  }

  const varCheck = {
    agnes_keys:        env.agnesKeys.length > 0 ? `[set, ${env.agnesKeys.length} key(s)]` : '[not set]',
    agnes_cn_keys:     env.agnesCnKeys.length > 0 ? `[set, ${env.agnesCnKeys.length} key(s)]` : '[not set]',
    zhipu_keys:        env.zhipuKeys.length > 0 ? `[set, ${env.zhipuKeys.length} key(s)]` : '[not set]',
    agnes_base_url:    env.agnesBaseUrl || '[default]',
    agnes_cn_base_url: env.agnesCnBaseUrl || '[default]',
    zhipu_base_url:    env.zhipuBaseUrl || '[default]',
    agnes_model:       env.agnesModel || '[default]',
    agnes_cn_model:    env.agnesCnModel || '[default]',
    zhipu_model:       env.zhipuModel || '[default]',
  };

  const status = {
    status: 'ok',
    variables: varCheck,
    providers: pool.getStatus(),
    kv: kvStatus,
    session: { hint: 'POST to /api/chat with {messages, imageData?, sessionId?}' },
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(status, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// ── Helpers ──
function jsonError(status: number, message: string, extra?: any): Response {
  const body: any = { error: message };
  if (extra) body.details = extra;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
