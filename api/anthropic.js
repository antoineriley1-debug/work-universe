// api/anthropic.js — Work Universe OS AI gateway (standalone Vercel project)
// Holds the Anthropic key server-side; only answers a valid Supabase login.

module.exports = async (req, res) => {
 if (req.method !== "POST") {
 return res.status(405).json({ error: "POST only" });
 }
 try {
 const { ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
 if (!ANTHROPIC_API_KEY) {
 return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel environment variables." });
 }
 if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
 return res.status(500).json({ error: "SUPABASE_URL / SUPABASE_ANON_KEY are not set in Vercel environment variables." });
 }

 const auth = req.headers.authorization || "";
 if (!auth.startsWith("Bearer ")) {
 return res.status(401).json({ error: "Sign in to Cloud Sync in Settings to use AI on the site." });
 }
 const who = await fetch(SUPABASE_URL.replace(/\/+$/, "") + "/auth/v1/user", {
 headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth }
 });
 if (!who.ok) {
 return res.status(401).json({ error: "Cloud session invalid or expired — sign in again in Settings." });
 }

 const body = req.body || {};
 const messages = Array.isArray(body.messages) ? body.messages : null;
 if (!messages || !messages.length) {
 return res.status(400).json({ error: "messages required" });
 }
 const payload = {
 model: typeof body.model === "string" && /^claude-/.test(body.model) ? body.model : "claude-sonnet-4-20250514",
 max_tokens: Math.min(parseInt(body.max_tokens, 10) || 1000, 2000),
 messages
 };

 const r = await fetch("https://api.anthropic.com/v1/messages", {
 method: "POST",
 headers: {
 "x-api-key": ANTHROPIC_API_KEY,
 "anthropic-version": "2023-06-01",
 "content-type": "application/json"
 },
 body: JSON.stringify(payload)
 });
 const data = await r.json().catch(() => ({}));
 return res.status(r.status).json(data);
 } catch (e) {
 return res.status(500).json({ error: String((e && e.message) || e) });
 }
};
