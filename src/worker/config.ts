// ═════════════════════════════════════════════════════════
// config.ts — All values lowercase, defaults hardcoded
// Supports KV overrides via admin panel
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
// Helpers
// ═════════════════════════════════════════════════════════
function num(env: Env, key: keyof Env, fallback: number): number {
  // 1. Check KV override first
  const override = kvOverrides.get(key as string);
  if (override !== undefined) {
    const p = parseFloat(override);
    if (!isNaN(p)) return p;
  }
  // 2. Check env (from Cloudflare Secrets/Vars)
  const v = env[key] as unknown as string | number | undefined;
  if (v === undefined || v === '' || v === null) return fallback;
  if (typeof v === 'number') return v;
  const p = parseFloat(v);
  return isNaN(p) ? fallback : p;
}

function str(env: Env, key: keyof Env, fallback: string): string {
  const override = kvOverrides.get(key as string);
  if (override !== undefined) return override;
  const v = env[key] as unknown as string | undefined;
  if (v === undefined || v === '' || v === null) return fallback;
  return v;
}

function parseKeys(env: Env, key: keyof Env): string[] {
  const override = kvOverrides.get(key as string);
  const raw = override !== undefined ? override : (env[key] as unknown as string | undefined);
  if (!raw) return [];
  return Array.from(new Set(raw.split(',').map(k => k.trim()).filter(k => k.length > 0)));
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
// ═══════════════════════════════════════════════════════
export function handleConfigRequest(env: Env): Response {
  const groups: Record<string, any[]> = {};
  for (const [varName, info] of Object.entries(VAR_DOCS)) {
    const override = kvOverrides.get(varName);
    const fromEnv = (env as any)[varName];
    const current = override !== undefined ? override
                  : fromEnv !== undefined && fromEnv !== '' ? fromEnv
                  : info.default;
    const source = override !== undefined ? 'kv'
                  : fromEnv !== undefined && fromEnv !== '' ? 'env'
                  : 'default';

    const isSecret = varName.includes('keys') || varName.includes('password') || varName.includes('token');
    const displayValue = isSecret && current && String(current).length > 8
      ? String(current).substring(0, 4) + '•'.repeat(Math.max(0, String(current).length - 8)) + String(current).substring(String(current).length - 4)
      : current;

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
    secrets_needed: ['agnes_keys', 'agnes_cn_keys (optional)', 'zhipu_keys (recommended)'],
    vars_optional: 'All other vars have hardcoded defaults in src/worker/config.ts.',
    runtime: buildRuntimeConfig(env),
    groups,
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
