// ═════════════════════════════════════════════════════════
// types.ts — Environment variables (all lowercase) + types
// ═════════════════════════════════════════════════════════

// ─── Cloudflare-injected raw env (all lowercase) ───
export interface RawEnv {
  RIDDLE_KV?: any;

  // ─── Secrets (encrypted) ───
  agnes_keys?: string;      // comma-separated Agnes Intl keys
  agnes_cn_keys?: string;   // comma-separated Agnes CN keys
  zhipu_keys?: string;      // comma-separated Zhipu keys
  admin_password?: string;   // admin panel password
  admin_token?: string;      // session signing secret

  // ─── Optional overrides (set in Cloudflare Vars if you want to tweak) ───
  // If not set, hardcoded defaults in config.ts are used.
  agnes_base_url?: string;
  agnes_cn_base_url?: string;
  zhipu_base_url?: string;
  agnes_model?: string;
  agnes_cn_model?: string;
  zhipu_model?: string;

  idle_timeout_ms?: string;
  min_dist_px?: string;
  max_dist_px?: string;
  pressure_min_px?: string;
  pressure_max_px?: string;
  poll_interval_ms?: string;
  stroke_interval_ms?: string;
  stroke_max_dur_ms?: string;
  svg_stroke_width?: string;
  max_lines?: string;
  line_height_px?: string;
  margin_top_px?: string;
  margin_x_px?: string;
  font_size_px?: string;
  reply_fade_delay_ms?: string;
  fade_duration_ms?: string;
  history_ttl_sec?: string;
  max_history_turns?: string;
  max_retries?: string;
  request_timeout_ms?: string;
  max_tokens?: string;
  temperature?: string;

  ASSETS?: any;
}

// ─── Internal Env (what the rest of the code uses) ───
export interface Env {
  RIDDLE_KV: any;

  // Admin
  adminPassword?: string;
  adminToken?: string;

  // Provider keys
  agnesKeys: string[];
  agnesCnKeys: string[];
  zhipuKeys: string[];

  // URLs & models
  agnesBaseUrl: string;
  agnesCnBaseUrl: string;
  zhipuBaseUrl: string;
  agnesModel: string;
  agnesCnModel: string;
  zhipuModel: string;

  // ── Writing capture ──
  idleTimeoutMs: number;
  minDistPx: number;
  maxDistPx: number;
  pressureMinPx: number;
  pressureMaxPx: number;

  // ── Reply animation ──
  pollIntervalMs: number;
  strokeIntervalMs: number;
  strokeMaxDurMs: number;
  svgStrokeWidth: number;
  maxLines: number;
  lineHeightPx: number;
  marginTopPx: number;
  marginXPx: number;
  fontSizePx: number;

  // ── Lifecycle ──
  replyFadeDelayMs: number;
  fadeDurationMs: number;
  historyTtlSec: number;

  // ── Backend ──
  maxHistoryTurns: number;
  maxRetries: number;
  requestTimeoutMs: number;
  maxTokens: number;
  temperature: number;

  ASSETS?: any;
}

// ─── Runtime config sent to frontend ───
export interface RuntimeConfig {
  idleTimeoutMs: number;
  minDistPx: number;
  maxDistPx: number;
  pressureMinPx: number;
  pressureMaxPx: number;
  pollIntervalMs: number;
  strokeIntervalMs: number;
  strokeMaxDurMs: number;
  svgStrokeWidth: number;
  maxLines: number;
  lineHeightPx: number;
  marginTopPx: number;
  marginXPx: number;
  fontSizePx: number;
  replyFadeDelayMs: number;
  fadeDurationMs: number;
  maxHistoryTurns: number;
  maxRetries: number;
  requestTimeoutMs: number;
}

// ─── Chat message ───
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: any;
}

export interface KeySlot {
  key: string;
  cooldownUntil: number;
}

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  model: string;
  supportsVision: boolean;
  keys: string[];
}

export interface SessionData {
  sid: string;
  createdAt: number;
  messageCount: number;
  lastVisionText?: string;
}

// ─── Var docs for /api/config (human-readable reference) ───
export const VAR_DOCS: Record<string, { default: string; desc: string; group: string }> = {
  // ── Secrets (required) ──
  agnes_keys:      { default: '(empty)',  desc: 'Agnes Intl API keys, comma-separated',     group: 'Secrets' },
  agnes_cn_keys:   { default: '(empty)',  desc: 'Agnes China API keys, comma-separated',   group: 'Secrets' },
  zhipu_keys:      { default: '(empty)',  desc: 'Zhipu AI API keys, comma-separated',      group: 'Secrets' },

  // ── URLs (optional overrides) ──
  agnes_base_url:      { default: 'https://apihub.agnes-ai.com/v1',  desc: 'Agnes Intl API base URL',  group: 'URLs' },
  agnes_cn_base_url:   { default: 'https://apihub.agnes-ai.cn/v1',  desc: 'Agnes China API base URL', group: 'URLs' },
  zhipu_base_url:      { default: 'https://open.bigmodel.cn/api/paas/v4', desc: 'Zhipu API base URL', group: 'URLs' },

  // ── Models (optional overrides) ──
  agnes_model:      { default: 'agnes-2.5-flash',  desc: 'Agnes Intl model name',  group: 'Models' },
  agnes_cn_model:   { default: 'agnes-2.5-flash',  desc: 'Agnes China model name', group: 'Models' },
  zhipu_model:      { default: 'glm-4v-flash',     desc: 'Zhipu model name',       group: 'Models' },

  // ── Tuning (optional, hardcoded defaults in config.ts) ──
  idle_timeout_ms:      { default: '1500',   desc: 'Idle ms before sending',            group: 'Tuning' },
  min_dist_px:           { default: '0.6',    desc: 'Min sampling distance (px)',        group: 'Tuning' },
  max_dist_px:           { default: '3.0',    desc: 'Max interpolation distance (px)',   group: 'Tuning' },
  pressure_min_px:       { default: '2.0',    desc: 'Min stroke width (px)',             group: 'Tuning' },
  pressure_max_px:       { default: '5.5',    desc: 'Max stroke width (px)',             group: 'Tuning' },
  poll_interval_ms:       { default: '50',     desc: 'Per-char reveal interval (ms)',     group: 'Tuning' },
  stroke_interval_ms:     { default: '55',     desc: 'Per-stroke animation (ms)',         group: 'Tuning' },
  stroke_max_dur_ms:      { default: '2500',   desc: 'Max single stroke duration (ms)',  group: 'Tuning' },
  svg_stroke_width:       { default: '1.8',    desc: 'SVG path stroke width (px)',       group: 'Tuning' },
  max_lines:              { default: '20',     desc: 'Max reply lines',                   group: 'Tuning' },
  line_height_px:         { default: '36',     desc: 'Line height (px)',                  group: 'Tuning' },
  margin_top_px:          { default: '6',      desc: 'Reply top margin (px)',              group: 'Tuning' },
  margin_x_px:            { default: '28',     desc: 'Reply left margin (px)',            group: 'Tuning' },
  font_size_px:           { default: '28',     desc: 'Base font size (px)',               group: 'Tuning' },
  reply_fade_delay_ms:    { default: '8000',   desc: 'Delay before fade (ms)',           group: 'Tuning' },
  fade_duration_ms:       { default: '1200',   desc: 'Fade animation duration (ms)',     group: 'Tuning' },
  history_ttl_sec:        { default: '86400',  desc: 'KV memory TTL (seconds)',          group: 'Tuning' },
  max_history_turns:      { default: '20',     desc: 'Max conversation history turns',   group: 'Tuning' },
  max_retries:            { default: '4',      desc: 'Max API retry attempts',           group: 'Tuning' },
  request_timeout_ms:     { default: '90000',  desc: 'Single request timeout (ms)',     group: 'Tuning' },
  max_tokens:              { default: '500',    desc: 'LLM max output tokens',            group: 'Tuning' },
  temperature:             { default: '0.7',    desc: 'LLM sampling temperature',         group: 'Tuning' },
};
