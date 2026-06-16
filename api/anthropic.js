// /api/anthropic — Work Universe OS AI gateway (Vercel serverless)
// Holds the Anthropic key server-side so it's never exposed to the browser.
//
// Required env var:  ANTHROPIC_API_KEY
// Optional env vars:
//   GATEWAY_PASSCODE          — if set, callers must send a matching passcode (Settings → AI gateway passcode)
//   SUPABASE_URL / SUPABASE_ANON_KEY — only used to accept a Cloud Sync login as an alternate pass
//
// With none of the optional vars set, the Brain works immediately on your deployed site — no login needed.
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ error: "POST only" })); }

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) { res.statusCode = 500; return res.end(JSON.stringify({ error: "Server missing ANTHROPIC_API_KEY — add it in Vercel → Settings → Environment Variables, then redeploy." })); }

  const PASS = process.env.GATEWAY_PASSCODE || "";
  const SB_URL = process.env.SUPABASE_URL || "";
  const SB_ANON = process.env.SUPABASE_ANON_KEY || "";

  let body = req.body;
  if (!body || typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; } }
  const { access_token, passcode, model, max_tokens, system, messages } = body || {};
  if (!Array.isArray(messages) || !messages.length) { res.statusCode = 400; return res.end(JSON.stringify({ error: "No messages provided." })); }

  // ---- access control (only if the owner opted into it) ----
  let authed = !PASS; // no passcode configured → open by default
  if (PASS && passcode && passcode === PASS) authed = true;
  // a valid Cloud Sync login is always accepted as an alternate pass
  if (!authed && access_token && SB_URL && SB_ANON) {
    try {
      const u = await fetch(SB_URL.replace(/\/$/, "") + "/auth/v1/user", { headers: { apikey: SB_ANON, Authorization: "Bearer " + access_token } });
      if (u.ok) authed = true;
    } catch (e) { /* fall through to denial */ }
  }
  if (!authed) { res.statusCode = 401; return res.end(JSON.stringify({ error: "This gateway is locked. Enter the passcode in Settings → AI gateway passcode (it must match GATEWAY_PASSCODE in Vercel), or sign into Cloud Sync." })); }

  // ---- forward to Anthropic ----
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-6",
        max_tokens: Math.min(Number(max_tokens) || 1800, 4000),
        system: system || "",
        messages
      })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { res.statusCode = r.status; return res.end(JSON.stringify({ error: (j.error && j.error.message) || ("Anthropic " + r.status) })); }
    res.statusCode = 200; return res.end(JSON.stringify(j));
  } catch (e) {
    res.statusCode = 502; return res.end(JSON.stringify({ error: "Gateway error: " + e.message }));
  }
};
