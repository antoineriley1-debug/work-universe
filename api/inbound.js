// Vercel Serverless Function for Email Ingest
// Handler for POST requests from Cloudflare Worker

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQxMTAyOSwiZXhwIjoyMDk0OTg3MDI5fQ.gQqL_YcOD-DVLNdEiT_yE4EQGSL_OEAe03FTmQ2UxvI';
const EXPECTED_TOKEN = 'medstar-inbox-2026';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Parse JSON body from raw request
async function parseBody(req) {
  if (req.body instanceof Buffer) {
    return JSON.parse(req.body.toString('utf8'));
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }
  if (typeof req.body === 'object') {
    return req.body;
  }
  
  // Try to collect chunks if streaming
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Use POST to ingest emails'
    });
  }

  try {
    // Validate Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[INBOUND] Missing auth header');
      return res.status(401).json({ error: 'Missing Authorization header' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== EXPECTED_TOKEN) {
      console.log('[INBOUND] Invalid token:', token.substring(0, 10) + '...');
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Parse body
    let payload;
    try {
      payload = await parseBody(req);
    } catch (e) {
      console.log('[INBOUND] Parse error:', e.message);
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    // Validate required fields
    const { from, to, subject, text, html } = payload || {};
    if (!from || !to || !subject) {
      console.log('[INBOUND] Missing fields. Got:', Object.keys(payload || {}));
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['from', 'to', 'subject'],
        received: Object.keys(payload || {})
      });
    }

    // Insert into Supabase
    console.log('[INBOUND] Inserting email from', from, 'subject:', subject);
    
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
      console.error('[INBOUND] Supabase error:', error);
      return res.status(500).json({
        error: 'Database error',
        details: error.message
      });
    }

    console.log('[INBOUND] Success. Inserted ID:', data?.[0]?.id);
    return res.status(200).json({
      success: true,
      message: 'Email ingested',
      email_id: data?.[0]?.id,
      received_at: data?.[0]?.created_at
    });

  } catch (error) {
    console.error('[INBOUND] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
