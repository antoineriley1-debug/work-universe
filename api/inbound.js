// /api/inbound — receives a forwarded email and drops it into your cloud inbox queue.
// Cloudflare Email Routing → an Email Worker POSTs here; the app's "Sync Inbox" pulls it.
//
// Required env vars in Vercel:
//   INBOUND_SECRET        — any phrase; the worker must send the same one
//   SUPABASE_URL          — your Supabase project URL
//   SUPABASE_SERVICE_KEY  — Supabase service_role key (server-only; never in the browser)
//   INBOUND_USER_ID       — your Supabase user id (Authentication → Users → your row → User UID)
module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ error: "POST only" })); }

  const SECRET = process.env.INBOUND_SECRET || "";
  const SB_URL = process.env.SUPABASE_URL || "";
  const SVC = process.env.SUPABASE_SERVICE_KEY || "";
  const UID = process.env.INBOUND_USER_ID || "";
  if (!SECRET || !SB_URL || !SVC || !UID) { res.statusCode = 500; return res.end(JSON.stringify({ error: "Inbound not configured — set INBOUND_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, INBOUND_USER_ID in Vercel." })); }

  let body = req.body;
  if (!body || typeof body === "string") { try { body = JSON.parse(body || "{}"); } catch (e) { body = {}; } }
  if (body.secret !== SECRET) { res.statusCode = 401; return res.end(JSON.stringify({ error: "Bad secret" })); }

  const msg = { from: String(body.from || "").slice(0, 300), subject: String(body.subject || "").slice(0, 500), text: String(body.text || "").slice(0, 40000), at: new Date().toISOString() };
  const base = SB_URL.replace(/\/$/, "") + "/rest/v1/universe_store";
  const hdr = { apikey: SVC, Authorization: "Bearer " + SVC, "Content-Type": "application/json" };

  try {
    // read current queue for this user
    const g = await fetch(base + "?user_id=eq." + encodeURIComponent(UID) + "&key=eq.wuos:inbox&select=data", { headers: hdr });
    const rows = await g.json().catch(() => []);
    const queue = (rows[0] && Array.isArray(rows[0].data)) ? rows[0].data : [];
    queue.push(msg);
    // upsert it back
    const u = await fetch(base + "?on_conflict=user_id,key", {
      method: "POST",
      headers: Object.assign({}, hdr, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify([{ user_id: UID, key: "wuos:inbox", data: queue, updated_at: new Date().toISOString() }])
    });
    if (!u.ok) { const t = await u.text().catch(() => ""); res.statusCode = 502; return res.end(JSON.stringify({ error: "Queue write failed: " + t.slice(0, 160) })); }
    res.statusCode = 200; return res.end(JSON.stringify({ ok: true, queued: queue.length }));
  } catch (e) {
    res.statusCode = 502; return res.end(JSON.stringify({ error: "Inbound error: " + e.message }));
  }
};
