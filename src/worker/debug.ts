// ═══════════════════════════════════════════════════════
// debug.ts — Diagnostic endpoints to help debug 500 errors
// ═══════════════════════════════════════════════════════

export function handleDebugInfo(env: any): Response {
  const info: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env_keys: Object.keys(env).sort(),
    env_types: {},
    checks: {},
  };

  // Type check each env var
  for (const [k, v] of Object.entries(env)) {
    info.env_types[k] = typeof v;
  }

  // Check critical bindings
  info.checks.riddle_kv = typeof env.RIDDLE_KV === 'object' && env.RIDDLE_KV !== null
    ? '✅ object with methods: ' + Object.getOwnPropertyNames(Object.getPrototypeOf(env.RIDDLE_KV)).slice(0, 8).join(',')
    : '❌ ' + typeof env.RIDDLE_KV;

  info.checks.assets = typeof env.ASSETS === 'object' && env.ASSETS !== null
    ? '✅ object'
    : '⚠️ ' + typeof env.ASSETS + ' (may be ok in dev)';

  // Check secret presence (without revealing values)
  info.checks.agnes_keys = env.agnes_keys ? '✅ set (' + env.agnes_keys.length + ' chars)' : '❌ not set';
  info.checks.zhipu_keys = env.zhipu_keys ? '✅ set (' + env.zhipu_keys.length + ' chars)' : '❌ not set';
  info.checks.admin_password = env.admin_password !== undefined ? '✅ set' : '⚠️ not set (admin login will fail)';
  info.checks.admin_token = env.admin_token ? '✅ set' : '⚠️ using default';

  // Test KV
  if (env.RIDDLE_KV) {
    try {
      info.checks.kv_test = 'attempting…';
    } catch(e: any) {
      info.checks.kv_test = '❌ ' + e.message;
    }
  }

  return new Response(JSON.stringify(info, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// Test KV read/write
export async function handleDebugKv(env: any): Promise<Response> {
  if (!env.RIDDLE_KV) {
    return new Response(JSON.stringify({ error: 'RIDDLE_KV not bound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    await env.RIDDLE_KV.put('__debug__', 'ok', { expirationTtl: 60 });
    const val = await env.RIDDLE_KV.get('__debug__');
    return new Response(JSON.stringify({
      status: val === 'ok' ? '✅ KV works' : '❌ KV read mismatch',
      written: 'ok',
      read: val,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({
      error: 'KV test failed',
      message: e.message,
      stack: e.stack?.slice(0, 500),
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
