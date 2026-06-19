/**
 * Email Ingest Endpoint
 * Receives emails from Cloudflare Worker and stores in Supabase
 * 
 * POST /api/inbound
 * Authorization: Bearer {secret}
 * Body: { from, to, subject, text, html }
 */

const INBOUND_SECRET = process.env.INBOUND_SECRET || 'medstar-inbox-2026';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQYNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify authorization header
  const authHeader = req.headers.authorization || '';
  const [scheme, credentials] = authHeader.split(' ');

  if (scheme !== 'Bearer' || credentials !== INBOUND_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { from, to, subject, text, html } = req.body;

  // Validate required fields
  if (!from || !to || !subject) {
    return res.status(400).json({ error: 'Missing required fields: from, to, subject' });
  }

  try {
    // Insert into Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/universe_store`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          sender: from,
          recipient: to,
          subject,
          body_text: text,
          body_html: html,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Supabase error: ${response.status}`, error);
      
      // Return error with details so we can debug
      return res.status(response.status).json({
        success: false,
        message: 'Failed to store email in Supabase',
        email: { from, to, subject },
        supabase_error: error,
        supabase_status: response.status,
      });
    }

    const result = await response.json();

    return res.status(201).json({
      success: true,
      message: 'Email ingested successfully',
      email: { from, to, subject },
      data: result,
    });
  } catch (error) {
    console.error('Ingest error:', error);

    return res.status(500).json({
      error: 'Failed to ingest email',
      message: error.message,
    });
  }
}
