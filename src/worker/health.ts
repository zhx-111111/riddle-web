// ═════════════════════════════════════════════════════════
// health.ts — Health check
// ═════════════════════════════════════════════════════════

export async function handleHealth(): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'riddle-web',
    version: '3.9.0',
    timestamp: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
