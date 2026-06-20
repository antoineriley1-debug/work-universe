// /api/inbound — Email ingest from Cloudflare Worker

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQxMTAyOSwiZXhwIjoyMDk0OTg3MDI5fQ.gQqL_YcOD-DVLNdEiT_yE4EQGSL_OEAe03FTmQ2UxvI';
const EXPECTED_TOKEN = 'medstar-inbox-2026';

let supabase = null;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  console.error('Failed to initialize Supabase:', e.message);
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'POST only' }));
  }

  try {
    // Check authorization
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '').trim();

    if (token !== EXPECTED_TOKEN) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    // Get body
    const body = req.body;
    
    // Debug: log what we received
    console.log('[INBOUND] Body type:', typeof body, 'keys:', Object.keys(body || {}));
    
    if (!body || typeof body !== 'object') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ 
        error: 'Missing or invalid body',
        received_type: typeof body,
        received_value: String(body).substring(0, 50)
      }));
    }

    const { from, to, subject, text, html } = body;

    // Validate required fields
    if (!from || !to || !subject) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        error: 'Missing required fields',
        have_from: !!from,
        have_to: !!to,
        have_subject: !!subject
      }));
    }

    // Check Supabase
    if (!supabase) {
      res.statusCode = 500;
      return res.end(JSON.stringify({ error: 'Supabase not initialized' }));
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
      res.statusCode = 500;
      return res.end(JSON.stringify({
        error: 'Database error',
        message: error.message
      }));
    }

    // Success
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      email_id: data?.[0]?.id,
      created_at: data?.[0]?.created_at
    }));

  } catch (err) {
    console.error('[INBOUND] Exception:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({
      error: err.message
    }));
  }
};
