// ═════════════════════════════════════════════════════════
// config.ts — All values lowercase, defaults hardcoded
// Supports KV overrides via admin panel
// Compatible with BOTH camelCase (agnesKeys) and snake_case (agnes_keys)
// ═════════════════════════════════════════════════════════

import type { Env, RuntimeConfig } from './types';
import { VAR_DOCS } from './types';

// ═════════════════════════════════════════════════════════
// HARDCODED DEFAULTS
// ═════════════════════════════════════════════════════════

// ─── Writing capture ───
const DEFAULT_IDLE_TIMEOUT_MS   = 1500;
const DEFAULT_MIN_DIST_PX      = 0.6;
const DEFAULT_MAX_DIST_PX      = 3.0;
const DEFAULT_PRESSURE_MIN_PX  = 2.0;
const DEFAULT_PRESSURE_MAX_PX  = 5.5;

// ─── Reply animation ───
const DEFAULT_POLL_INTERVAL_MS    = 50;
const DEFAULT_STROKE_INTERVAL_MS = 55;
const DEFAULT_STROKE_MAX_DUR_MS  = 2500;
const DEFAULT_SVG_STROKE_WIDTH   = 1.8;
const DEFAULT_MAX_LINES          = 20;
const DEFAULT_LINE_HEIGHT_PX     = 36;
const DEFAULT_MARGIN_TOP_PX      = 6;
const DEFAULT_MARGIN_X_PX        = 28;
const DEFAULT_FONT_SIZE_PX       = 28;

// ─── Lifecycle ───
const DEFAULT_REPLY_FADE_DELAY_MS = 8000;
const DEFAULT_FADE_DURATION_MS   = 1200;
const DEFAULT_HISTORY_TTL_SEC    = 86400;

// ─── Backend ───
const DEFAULT_MAX_HISTORY_TURNS = 20;
const DEFAULT_MAX_RETRIES      = 4;
const DEFAULT_REQUEST_TIMEOUT_MS = 90000;
const DEFAULT_MAX_TOKENS       = 500;
const DEFAULT_TEMPERATURE      = 0.7;

// ═════════════════════════════════════════════════════════
// KV-backed override cache (populated by admin panel)
// ═════════════════════════════════════════════════════════
declare global {
  var __riddleKvOverrides: Map<string, string> | undefined;
}
const kvOverrides: Map<string, string> = (globalThis.__riddleKvOverrides ||= new Map());

export function setKvOverride(key: string, value: string): void {
  kvOverrides.set(key, value);
}
export function clearKvOverrides(): void {
  kvOverrides.clear();
}
export function getAllKvOverrides(): Record<string, string> {
  return Object.fromEntries(kvOverrides.entries());
}

// ═════════════════════════════════════════════════════════
// Variable name mapping: snake_case ↔ camelCase
// Cloudflare injects vars as-is from dashboard.
// Dashboard shows snake_case, but JS object access is camelCase.
// We try BOTH for every lookup.
// ═════════════════════════════════════════════════════════

// snake_case → camelCase converter
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// camelCase → snake_case converter
function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

// Read from raw env with dual-name support
// Priority: snake_case first (matches wrangler.toml [vars] + Dashboard display)
function readRaw(raw: any, camelName: string): any {
  const snake = toSnake(camelName);
  // Try snake_case first (e.g. "agnes_keys") — this is what wrangler.toml sets
  if (raw[snake] !== undefined && raw[snake] !== '') {
    return raw[snake];
  }
  // Fallback to camelCase (e.g. "agnesKeys") — for direct code overrides
  if (raw[camelName] !== undefined && raw[camelName] !== '') {
    return raw[camelName];
  }
  return undefined;
}

// ═════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════
function num(raw: any, camelName: string, fallback: number): number {
  // 1. Check KV override first (admin panel writes snake_case keys)
  const snakeName = toSnake(camelName);
  const override = kvOverrides.get(snakeName);
  if (override !== undefined) {
    const p = parseFloat(override);
    if (!isNaN(p)) return p;
  }
  // 2. Check env (try both naming conventions)
  const v = readRaw(raw, camelName);
  if (v === undefined || v === '' || v === null) return fallback;
  if (typeof v === 'number') return v;
  const p = parseFloat(v);
  return isNaN(p) ? fallback : p;
}

function str(raw: any, camelName: string, fallback: string): string {
  const snakeName = toSnake(camelName);
  const override = kvOverrides.get(snakeName);
  if (override !== undefined) return override;
  const v = readRaw(raw, camelName);
  if (v === undefined || v === '' || v === null) return fallback;
  return String(v);
}

function parseKeys(raw: any, camelName: string): string[] {
  const snakeName = toSnake(camelName);
  const override = kvOverrides.get(snakeName);
  const raw_val = override !== undefined ? override : readRaw(raw, camelName);
  if (!raw_val) return [];
  return Array.from(new Set(String(raw_val).split(',').map(k => k.trim()).filter(k => k.length > 0)));
}

// ═════════════════════════════════════════════════════════
// Build Env from RawEnv + KV overrides
// ═════════════════════════════════════════════════════════
export function buildEnv(raw: any): Env {
  return {
    RIDDLE_KV: raw.RIDDLE_KV,

    adminPassword: str(raw, 'adminPassword', ''),
    adminToken: str(raw, 'adminToken', 'riddle-default-secret'),

    agnesKeys: parseKeys(raw, 'agnesKeys'),
    agnesCnKeys: parseKeys(raw, 'agnesCnKeys'),
    zhipuKeys: parseKeys(raw, 'zhipuKeys'),

    agnesBaseUrl: str(raw, 'agnesBaseUrl', 'https://apihub.agnes-ai.com/v1'),
    agnesCnBaseUrl: str(raw, 'agnesCnBaseUrl', 'https://apihub.agnes-ai.cn/v1'),
    zhipuBaseUrl: str(raw, 'zhipuBaseUrl', 'https://open.bigmodel.cn/api/paas/v4'),
    agnesModel: str(raw, 'agnesModel', 'agnes-2.5-flash'),
    agnesCnModel: str(raw, 'agnesCnModel', 'agnes-2.5-flash'),
    zhipuModel: str(raw, 'zhipuModel', 'glm-4v-flash'),

    idleTimeoutMs: num(raw, 'idleTimeoutMs', DEFAULT_IDLE_TIMEOUT_MS),
    minDistPx: num(raw, 'minDistPx', DEFAULT_MIN_DIST_PX),
    maxDistPx: num(raw, 'maxDistPx', DEFAULT_MAX_DIST_PX),
    pressureMinPx: num(raw, 'pressureMinPx', DEFAULT_PRESSURE_MIN_PX),
    pressureMaxPx: num(raw, 'pressureMaxPx', DEFAULT_PRESSURE_MAX_PX),

    pollIntervalMs: num(raw, 'pollIntervalMs', DEFAULT_POLL_INTERVAL_MS),
    strokeIntervalMs: num(raw, 'strokeIntervalMs', DEFAULT_STROKE_INTERVAL_MS),
    strokeMaxDurMs: num(raw, 'strokeMaxDurMs', DEFAULT_STROKE_MAX_DUR_MS),
    svgStrokeWidth: num(raw, 'svgStrokeWidth', DEFAULT_SVG_STROKE_WIDTH),
    maxLines: num(raw, 'maxLines', DEFAULT_MAX_LINES),
    lineHeightPx: num(raw, 'lineHeightPx', DEFAULT_LINE_HEIGHT_PX),
    marginTopPx: num(raw, 'marginTopPx', DEFAULT_MARGIN_TOP_PX),
    marginXPx: num(raw, 'marginXPx', DEFAULT_MARGIN_X_PX),
    fontSizePx: num(raw, 'fontSizePx', DEFAULT_FONT_SIZE_PX),

    replyFadeDelayMs: num(raw, 'replyFadeDelayMs', DEFAULT_REPLY_FADE_DELAY_MS),
    fadeDurationMs: num(raw, 'fadeDurationMs', DEFAULT_FADE_DURATION_MS),
    historyTtlSec: num(raw, 'historyTtlSec', DEFAULT_HISTORY_TTL_SEC),

    maxHistoryTurns: num(raw, 'maxHistoryTurns', DEFAULT_MAX_HISTORY_TURNS),
    maxRetries: num(raw, 'maxRetries', DEFAULT_MAX_RETRIES),
    requestTimeoutMs: num(raw, 'requestTimeoutMs', DEFAULT_REQUEST_TIMEOUT_MS),
    maxTokens: num(raw, 'maxTokens', DEFAULT_MAX_TOKENS),
    temperature: num(raw, 'temperature', DEFAULT_TEMPERATURE),

    ASSETS: raw.ASSETS,
  };
}

// ═════════════════════════════════════════════════════════
// Build runtime config (sent to frontend)
// ═════════════════════════════════════════════════════════
export function buildRuntimeConfig(env: Env): RuntimeConfig {
  return {
    idleTimeoutMs:     env.idleTimeoutMs,
    minDistPx:         env.minDistPx,
    maxDistPx:         env.maxDistPx,
    pressureMinPx:     env.pressureMinPx,
    pressureMaxPx:     env.pressureMaxPx,
    pollIntervalMs:    env.pollIntervalMs,
    strokeIntervalMs:  env.strokeIntervalMs,
    strokeMaxDurMs:    env.strokeMaxDurMs,
    svgStrokeWidth:    env.svgStrokeWidth,
    maxLines:          env.maxLines,
    lineHeightPx:      env.lineHeightPx,
    marginTopPx:       env.marginTopPx,
    marginXPx:         env.marginXPx,
    fontSizePx:        env.fontSizePx,
    replyFadeDelayMs:  env.replyFadeDelayMs,
    fadeDurationMs:    env.fadeDurationMs,
    maxHistoryTurns:   env.maxHistoryTurns,
    maxRetries:        env.maxRetries,
    requestTimeoutMs:  env.requestTimeoutMs,
  };
}

// ═════════════════════════════════════════════════════════
// Build backend config (used by chat.ts)
// ═════════════════════════════════════════════════════════
export function buildBackendConfig(env: Env) {
  return {
    maxHistoryTurns:  env.maxHistoryTurns,
    maxRetries:       env.maxRetries,
    requestTimeoutMs: env.requestTimeoutMs,
    maxTokens:        env.maxTokens,
    temperature:      env.temperature,
    historyTtlSec:    env.historyTtlSec,
  };
}

// ═════════════════════════════════════════════════════════
// GET /api/config — show all vars + current values
// Uses snake_case names (matches dashboard + admin panel)
// ═════════════════════════════════════════════════════════
export function handleConfigRequest(env: Env): Response {
  const groups: Record<string, any[]> = {};

  // Build a lookup from snake_case name → current value
  const currentValues: Record<string, any> = {
    'agnes_keys':          env.agnesKeys.join(','),
    'agnes_cn_keys':       env.agnesCnKeys.join(','),
    'zhipu_keys':          env.zhipuKeys.join(','),
    'admin_password':      env.adminPassword,
    'admin_token':         env.adminToken,
    'agnes_base_url':      env.agnesBaseUrl,
    'agnes_cn_base_url':   env.agnesCnBaseUrl,
    'zhipu_base_url':      env.zhipuBaseUrl,
    'agnes_model':         env.agnesModel,
    'agnes_cn_model':      env.agnesCnModel,
    'zhipu_model':         env.zhipuModel,
    'idle_timeout_ms':     env.idleTimeoutMs,
    'min_dist_px':         env.minDistPx,
    'max_dist_px':         env.maxDistPx,
    'pressure_min_px':     env.pressureMinPx,
    'pressure_max_px':     env.pressureMaxPx,
    'poll_interval_ms':    env.pollIntervalMs,
    'stroke_interval_ms':  env.strokeIntervalMs,
    'stroke_max_dur_ms':   env.strokeMaxDurMs,
    'svg_stroke_width':    env.svgStrokeWidth,
    'max_lines':           env.maxLines,
    'line_height_px':      env.lineHeightPx,
    'margin_top_px':       env.marginTopPx,
    'margin_x_px':         env.marginXPx,
    'font_size_px':        env.fontSizePx,
    'reply_fade_delay_ms': env.replyFadeDelayMs,
    'fade_duration_ms':    env.fadeDurationMs,
    'history_ttl_sec':     env.historyTtlSec,
    'max_history_turns':   env.maxHistoryTurns,
    'max_retries':         env.maxRetries,
    'request_timeout_ms':  env.requestTimeoutMs,
    'max_tokens':          env.maxTokens,
    'temperature':         env.temperature,
  };

  for (const [varName, info] of Object.entries(VAR_DOCS)) {
    const override = kvOverrides.get(varName);
    const current = override !== undefined ? override : currentValues[varName];

    const isSecret = varName.includes('keys') || varName.includes('password') || varName.includes('token');
    const displayValue = isSecret && current && String(current).length > 8
      ? String(current).substring(0, 4) + '•'.repeat(Math.max(0, String(current).length - 8)) + String(current).substring(String(current).length - 4)
      : (current ?? info.default);

    const source = override !== undefined ? 'kv'
                  : current !== undefined && current !== '' && current !== info.default ? 'env'
                  : 'default';

    const entry = {
      var: varName,
      default: info.default,
      current: displayValue,
      source,
      desc: info.desc,
      group: info.group,
    };
    if (!groups[info.group]) groups[info.group] = [];
    groups[info.group].push(entry);
  }

  const response = {
    status: 'ok',
    secrets_needed: ['agnes_keys', 'agnes_cn_keys (optional)', 'zhipu_keys (recommended)', 'admin_password', 'admin_token'],
    vars_preset_in_wrangler: ['agnesModel', 'agnesCnModel', 'zhipuModel', 'agnesBaseUrl', 'agnesCnBaseUrl', 'zhipuBaseUrl', 'adminPassword', 'adminToken'],
    note: 'Other vars use hardcoded defaults in config.ts. All 28 params editable via /admin panel.',
    runtime: buildRuntimeConfig(env),
    groups,
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
