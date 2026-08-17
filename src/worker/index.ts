// ═════════════════════════════════════════════════════════
// index.ts — Worker main entry
// ═════════════════════════════════════════════════════════

import { handleChatRequest, handleSetupRequest } from './chat';
import { handleHealth } from './health';
import { handleInit } from './init';
import { handleConfigRequest, buildEnv } from './config';
import { handleDebugInfo, handleDebugKv } from './debug';
import {
  handleAdminLoginPage,
  handleAdminLogin,
  handleAdminLogout,
  handleAdminPage,
  handleAdminGetConfig,
  handleAdminPutConfig,
  handleAdminReload,
} from './admin';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Build Env from raw Cloudflare env + KV overrides
    const environment: Env = buildEnv(env);

    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ─── Admin routes ───
      if (path === '/admin/login' && request.method === 'GET') {
        return handleAdminLoginPage();
      }
      if (path === '/api/admin/login' && request.method === 'POST') {
        return await handleAdminLogin(request, environment);
      }
      if (path === '/api/admin/logout' && request.method === 'POST') {
        return handleAdminLogout();
      }
      if (path === '/admin' && request.method === 'GET') {
        return handleAdminPage(request, environment);
      }
      if (path === '/api/admin/config' && request.method === 'GET') {
        return await handleAdminGetConfig(request, environment);
      }
      if (path === '/api/admin/config' && request.method === 'PUT') {
        return await handleAdminPutConfig(request, environment);
      }
      if (path === '/api/admin/reload' && request.method === 'POST') {
        return await handleAdminReload(request, environment);
      }

      // ─── Public API routes ───
      if (path === '/api/chat' && request.method === 'POST') {
        return await handleChatRequest(request, environment);
      }
      if (path === '/api/setup' && request.method === 'GET') {
        return await handleSetupRequest(environment);
      }
      if (path === '/api/init' && request.method === 'GET') {
        return await handleInit(request, environment);
      }
      if (path === '/api/config' && request.method === 'GET') {
        return handleConfigRequest(environment);
      }
      if (path === '/api/health' && request.method === 'GET') {
        return handleHealth();
      }

      // ─── Debug routes (temporary, remove after fixing 500) ───
      if (path === '/api/debug' && request.method === 'GET') {
        return handleDebugInfo(env);
      }
      if (path === '/api/debug/kv' && request.method === 'GET') {
        return await handleDebugKv(env);
      }

      // Static assets
      if (environment.ASSETS) {
        return environment.ASSETS.fetch(request);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error: any) {
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  },
};
