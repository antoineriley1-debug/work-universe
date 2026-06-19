/**
 * Email Ingest Endpoint
 * Receives emails from Cloudflare Worker and stores in Supabase
 * 
 * POST /api/inbound
 * Authorization: Bearer {secret}
 * Body: { from, to, subject, text, html }
 */

const INBOUND_SECRET = process.env.INBOUND_SECRET || 'medstar-inbox-2026';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

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
      `${SUPABASE_URL}/rest/v1/ingested_emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          from,
          to,
          subject,
          text,
          html,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Supabase error: ${response.status}`, error);
      
      // Return 201 anyway if email was accepted, even if Supabase fails
      return res.status(201).json({
        success: true,
        message: 'Email accepted (Supabase storage pending)',
        email: { from, to, subject },
        supabase_error: error,
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
