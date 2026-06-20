import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQxMTAyOSwiZXhwIjoyMDk0OTg3MDI5fQ.gQqL_YcOD-DVLNdEiT_yE4EQGSL_OEAe03FTmQ2UxvI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected authorization token
const EXPECTED_TOKEN = 'medstar-inbox-2026';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST to ingest emails.' });
  }

  try {
    // 1. Validate Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== EXPECTED_TOKEN) {
      return res.status(403).json({ error: 'Invalid authorization token' });
    }

    // 2. Parse request body
    let payload = req.body;
    
    // If body is a string (JSON string), parse it
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid JSON in body', details: e.message });
      }
    }
    
    if (typeof payload !== 'object' || payload === null) {
      return res.status(400).json({ error: 'Invalid JSON payload', received: typeof payload });
    }

    // 3. Validate required fields
    const { from, to, subject, text, html } = payload;
    if (!from || !to || !subject) {
      return res.status(400).json({
        error: 'Missing required fields: from, to, subject',
      });
    }

    // 4. Insert email into Supabase
    const { data, error } = await supabase
      .from('ingested_emails')
      .insert([
        {
          from,
          to,
          subject,
          text: text || null,
          html: html || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to store email in database',
        details: error.message,
      });
    }

    // 5. Return success response
    return res.status(200).json({
      success: true,
      message: 'Email ingested successfully',
      email: data[0] || null,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
