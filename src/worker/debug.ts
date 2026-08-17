// ═════════════════════════════════════════════════════
// debug.ts — Diagnostic endpoints (KV optional, never throws 500)
// ═════════════════════════════════════════════════════

export function handleDebugInfo(env: any): Response {
  const info: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    deployment: {
      name: 'riddle-web',
      version: '3.9.0',
      mode: 'cloudflare-workers',
    },
    env_keys: [],
    env_types: {},
    checks: {},
  };

  // Safely enumerate env keys
  try {
    info.env_keys = Object.keys(env).sort();
    for (const [k, v] of Object.entries(env)) {
      info.env_types[k] = typeof v;
    }
  } catch {}

  // Check RIDDLE_KV binding safely
  const kv = env.RIDDLE_KV;
  if (kv && typeof kv === 'object' && typeof kv.get === 'function') {
    info.checks.riddle_kv = '✅ bound and has KV methods';
    info.checks.riddle_kv_methods = Object.getOwnPropertyNames(
      Object.getPrototypeOf(kv)
    ).slice(0, 10).join(', ');
  } else if (kv === undefined) {
    info.checks.riddle_kv = '⚠️ NOT BOUND — go to Dashboard → Settings → Bindings → Add KV Namespace → Variable name: RIDDLE_KV';
  } else {
    info.checks.riddle_kv = '❌ bound but invalid type: ' + typeof kv;
  }

  // Check ASSETS binding
  if (env.ASSETS && typeof env.ASSETS === 'object') {
    info.checks.assets = '✅ bound';
  } else {
    info.checks.assets = '⚠️ not bound (frontend will use inline fallback)';
  }

  // Check secret presence (without revealing values)
  const secrets = ['agnes_keys', 'agnes_cn_keys', 'zhipu_keys', 'admin_password', 'admin_token'];
  for (const s of secrets) {
    const val = env[s];
    if (val && typeof val === 'string' && val.length > 0) {
      info.checks[s] = `✅ set (${val.length} chars)`;
    } else {
      // Try camelCase variant
      const camel = s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const val2 = env[camel];
      if (val2 && typeof val2 === 'string' && val2.length > 0) {
        info.checks[s] = `✅ set as ${camel} (${val2.length} chars)`;
      } else {
        const isOptional = s === 'agnes_cn_keys';
        info.checks[s] = isOptional ? '⚠️ not set (optional)' : '❌ NOT SET — add via Dashboard → Settings → Variables → Add Secret';
      }
    }
  }

  return new Response(JSON.stringify(info, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Test KV read/write — only if bound
export async function handleDebugKv(env: any): Promise<Response> {
  const kv = env.RIDDLE_KV;

  if (!kv || typeof kv.get !== 'function') {
    return new Response(JSON.stringify({
      status: 'skipped',
      message: 'RIDDLE_KV not bound. Bind it via Dashboard → Settings → Bindings → Add KV Namespace → Variable name: RIDDLE_KV',
      hint: 'KV is optional. Without it, the diary works but has no cross-session memory.',
    }), {
      status: 200, // Not an error — just not configured
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await kv.put('__debug__', 'ok', { expirationTtl: 60 });
    const val = await kv.get('__debug__');
    return new Response(JSON.stringify({
      status: val === 'ok' ? '✅ KV works' : '❌ KV read mismatch',
      written: 'ok',
      read: val,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({
      status: '❌ KV error',
      message: e.message,
      hint: 'Check that the KV namespace is correctly bound with variable name RIDDLE_KV',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}
