import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQxMTAyOSwiZXhwIjoyMDk0OTg3MDI5fQ.gQqL_YcOD-DVLNdEiT_yE4EQGSL_OEAe03FTmQ2UxvI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected authorization token
const EXPECTED_TOKEN = 'medstar-inbox-2026';

export async function POST(request) {
  try {
    // 1. Validate Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== EXPECTED_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate required fields
    const { from, to, subject, text, html } = payload;
    if (!from || !to || !subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: from, to, subject' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
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
      return new Response(
        JSON.stringify({ error: 'Failed to store email in database', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email ingested successfully',
        email: data[0] || null,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request) {
  // Return method not allowed for GET requests
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use POST to ingest emails.' }),
    { status: 405, headers: { 'Content-Type': 'application/json' } }
  );
}
