// /api/inbound — Email ingest for Cloudflare Worker integration
// Receives emails from universe@keraos.cc via Cloudflare Worker POST
// Stores them in Supabase ingested_emails table
//
// Expected:
//   Authorization header: "Bearer medstar-inbox-2026"
//   Body: { from, to, subject, text, html }
//
// Env vars:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQxMTAyOSwiZXhwIjoyMDk0OTg3MDI5fQ.gQqL_YcOD-DVLNdEiT_yE4EQGSL_OEAe03FTmQ2UxvI';
const EXPECTED_TOKEN = 'medstar-inbox-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async (req, res) => {
  // Set headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.end();
  }

  // Only POST
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
  }

  try {
    // Parse body (Vercel provides pre-parsed req.body)
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    if (!body || typeof body !== 'object') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Invalid body' }));
    }

    // Validate authorization
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== EXPECTED_TOKEN) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    // Extract fields
    const { from, to, subject, text, html } = body;
    if (!from || !to || !subject) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ 
        error: 'Missing required fields',
        required: ['from', 'to', 'subject']
      }));
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('ingested_emails')
      .insert([{
        from,
        to,
        subject,
        text: text || null,
        html: html || null,
        created_at: new Date().toISOString(),
      }])
      .select();

    if (error) {
      console.error('[INBOUND] DB error:', error.message);
      res.statusCode = 500;
      return res.end(JSON.stringify({
        error: 'Database error',
        details: error.message
      }));
    }

    // Success
    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      email_id: data?.[0]?.id,
      created_at: data?.[0]?.created_at
    }));

  } catch (err) {
    console.error('[INBOUND] Error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({
      error: 'Server error',
      message: err.message
    }));
  }
};
