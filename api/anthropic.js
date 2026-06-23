// /api/anthropic.js — Work Universe AI Gateway
// Resilient LLM proxy: exponential backoff, retries, provider failover, full logging
//
// Required env var:  ANTHROPIC_API_KEY
// Optional env vars:
//   OPENAI_API_KEY       — fallback provider if Anthropic fails all retries
//   GATEWAY_PASSCODE     — if set, callers must send a matching passcode
//   SUPABASE_URL / SUPABASE_ANON_KEY — accept Cloud Sync login as alternate pass

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Retry logic: 3 attempts with exponential backoff ──────────────────────────
async function callWithRetry(fn, label, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn(attempt);
      if (result.success) {
        console.log(`[ANTHROPIC-GW] ${label} succeeded on attempt ${attempt}`);
        return result;
      }
      // Retriable failure
      if (attempt < maxAttempts) {
        const backoff = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
        console.warn(`[ANTHROPIC-GW] ${label} attempt ${attempt} failed (${result.errorType}). Retrying in ${backoff}ms...`);
        await sleep(backoff);
      } else {
        console.error(`[ANTHROPIC-GW] ${label} failed all ${maxAttempts} attempts. Last error: ${result.errorType}`);
      }
    } catch (e) {
      const backoff = Math.pow(2, attempt) * 500;
      console.error(`[ANTHROPIC-GW] ${label} attempt ${attempt} threw: ${e.message}`);
      if (attempt < maxAttempts) await sleep(backoff);
    }
  }
  return { success: false, errorType: 'max_retries_exceeded' };
}

// ── Call Anthropic API ────────────────────────────────────────────────────────
async function callAnthropic(key, body, reqId, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const j = await r.json().catch(() => ({}));

    if (r.ok) {
      return { success: true, data: j, provider: 'anthropic' };
    }

    const errMsg = (j.error && j.error.message) || `HTTP ${r.status}`;
    const errType = r.status === 429 ? 'rate_limit' : r.status >= 500 ? 'server_error' : 'client_error';
    console.error(`[ANTHROPIC-GW] ${reqId} Anthropic ${errType} attempt ${attempt}: ${errMsg}`);

    // Don't retry client errors (4xx except 429)
    if (r.status >= 400 && r.status < 500 && r.status !== 429) {
      throw new Error(`Client error: ${errMsg}`);
    }

    return { success: false, errorType: errType, status: r.status, message: errMsg };
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      console.error(`[ANTHROPIC-GW] ${reqId} Anthropic timeout on attempt ${attempt}`);
      return { success: false, errorType: 'timeout' };
    }
    if (e.message && e.message.startsWith('Client error:')) throw e;
    console.error(`[ANTHROPIC-GW] ${reqId} Anthropic network error attempt ${attempt}: ${e.message}`);
    return { success: false, errorType: 'network_error', message: e.message };
  }
}

// ── Call OpenAI API (fallback) ────────────────────────────────────────────────
async function callOpenAI(key, body, reqId, attempt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  // Convert Anthropic message format to OpenAI format
  const messages = body.system
    ? [{ role: 'system', content: body.system }, ...body.messages]
    : body.messages;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: body.max_tokens || 1800,
        messages
      }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    const j = await r.json().catch(() => ({}));

    if (r.ok) {
      // Wrap OpenAI response in Anthropic-compatible format
      const text = j.choices?.[0]?.message?.content || '';
      return {
        success: true,
        provider: 'openai',
        data: {
          id: j.id,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text }],
          model: j.model,
          stop_reason: 'end_turn',
          usage: { input_tokens: j.usage?.prompt_tokens || 0, output_tokens: j.usage?.completion_tokens || 0 }
        }
      };
    }

    const errMsg = (j.error && j.error.message) || `HTTP ${r.status}`;
    const errType = r.status === 429 ? 'rate_limit' : r.status >= 500 ? 'server_error' : 'client_error';
    console.error(`[ANTHROPIC-GW] ${reqId} OpenAI ${errType} attempt ${attempt}: ${errMsg}`);
    return { success: false, errorType: errType, status: r.status, message: errMsg };
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') {
      console.error(`[ANTHROPIC-GW] ${reqId} OpenAI timeout on attempt ${attempt}`);
      return { success: false, errorType: 'timeout' };
    }
    console.error(`[ANTHROPIC-GW] ${reqId} OpenAI network error attempt ${attempt}: ${e.message}`);
    return { success: false, errorType: 'network_error', message: e.message };
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 200; return res.end('{}'); }
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'POST only' })); }

  const reqId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[ANTHROPIC-GW] ${reqId} — incoming request`);

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_KEY && !OPENAI_KEY) {
    console.error(`[ANTHROPIC-GW] ${reqId} — No API keys configured`);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Server missing API keys. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy.' }));
  }

  const PASS = process.env.GATEWAY_PASSCODE || '';
  const SB_URL = process.env.SUPABASE_URL || '';
  const SB_ANON = process.env.SUPABASE_ANON_KEY || '';

  let body = req.body;
  if (!body || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch (e) { body = {}; }
  }

  const { access_token, passcode, model, max_tokens, system, messages } = body || {};

  if (!Array.isArray(messages) || !messages.length) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'No messages provided.' }));
  }

  // ── Access control ──────────────────────────────────────────────────────────
  let authed = !PASS;
  if (PASS && passcode && passcode === PASS) authed = true;
  if (!authed && access_token && SB_URL && SB_ANON) {
    try {
      const u = await fetch(SB_URL.replace(/\/$/, '') + '/auth/v1/user', {
        headers: { apikey: SB_ANON, Authorization: 'Bearer ' + access_token }
      });
      if (u.ok) authed = true;
    } catch (e) { /* fall through */ }
  }
  if (!authed) {
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Gateway locked. Enter the passcode in Settings → AI gateway passcode.' }));
  }

  const llmBody = {
    model: model || 'claude-sonnet-4-6',
    max_tokens: Math.min(Number(max_tokens) || 1800, 4000),
    system: system || '',
    messages
  };

  // ── Try Anthropic first ─────────────────────────────────────────────────────
  if (ANTHROPIC_KEY) {
    console.log(`[ANTHROPIC-GW] ${reqId} — trying Anthropic`);
    const result = await callWithRetry(
      (attempt) => callAnthropic(ANTHROPIC_KEY, llmBody, reqId, attempt),
      `${reqId}/anthropic`
    );
    if (result.success) {
      res.statusCode = 200;
      return res.end(JSON.stringify(result.data));
    }
    console.warn(`[ANTHROPIC-GW] ${reqId} — Anthropic exhausted, trying fallback`);
  }

  // ── Fallback to OpenAI ──────────────────────────────────────────────────────
  if (OPENAI_KEY) {
    console.log(`[ANTHROPIC-GW] ${reqId} — trying OpenAI fallback`);
    const result = await callWithRetry(
      (attempt) => callOpenAI(OPENAI_KEY, llmBody, reqId, attempt),
      `${reqId}/openai`
    );
    if (result.success) {
      res.statusCode = 200;
      return res.end(JSON.stringify(result.data));
    }
    console.error(`[ANTHROPIC-GW] ${reqId} — OpenAI fallback also exhausted`);
  }

  // ── All providers failed ────────────────────────────────────────────────────
  console.error(`[ANTHROPIC-GW] ${reqId} — ALL providers failed`);
  res.statusCode = 503;
  return res.end(JSON.stringify({
    error: 'AI assistant is temporarily unavailable. Please try again in a moment.',
    requestId: reqId
  }));
};
