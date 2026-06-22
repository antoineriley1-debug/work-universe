// /api/inbound — Email ingest pipeline
// Accepts emails from Cloudflare Worker and stores in Supabase
//
// Auth: Bearer medstar-inbox-2026
// Body: { from, to, subject, text?, html? }

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
// Use ANON_KEY instead of SERVICE_ROLE_KEY (service role key was invalid)
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQZNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';
const EXPECTED_TOKEN = 'medstar-inbox-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  // Only POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'POST only' }));
  }

  try {
    // Validate auth
    const authHeader = (req.headers.authorization || '').trim();
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== EXPECTED_TOKEN) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    // Parse body
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    if (!body || typeof body !== 'object') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid request body' }));
    }

    // Validate required fields
    const { from, to, subject, text = null, html = null } = body;
    if (!from || !to || !subject) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Missing: from, to, subject' }));
    }

    // Insert email
    const { data, error } = await supabase
      .from('emails')
      .insert([{
        from,
        to,
        subject,
        text,
        html,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (error) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Database error: ' + error.message }));
    }

    // Success
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      email_id: data?.[0]?.id,
      created_at: data?.[0]?.created_at,
    }));

  } catch (err) {
    console.error('[INBOUND]', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Server error: ' + err.message }));
  }
};
