const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// ============= API ENDPOINTS =============

// Anthropic Gateway
app.post('/api/anthropic', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return res.status(500).json({
      error: 'Server missing ANTHROPIC_API_KEY'
    });
  }

  const PASS = process.env.GATEWAY_PASSCODE || '';
  const SB_URL = process.env.SUPABASE_URL || '';
  const SB_ANON = process.env.SUPABASE_ANON_KEY || '';

  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch (e) {
      body = {};
    }
  }

  const { access_token, passcode, model, max_tokens, system, messages } = body || {};

  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: 'No messages provided.' });
  }

  // Access control
  let authed = !PASS;
  if (PASS && passcode && passcode === PASS) authed = true;
  if (!authed && access_token && SB_URL && SB_ANON) {
    try {
      const u = await fetch(SB_URL.replace(/\/$/, '') + '/auth/v1/user', {
        headers: { apikey: SB_ANON, Authorization: 'Bearer ' + access_token }
      });
      if (u.ok) authed = true;
    } catch (e) {}
  }

  if (!authed) {
    return res.status(401).json({
      error: 'This gateway is locked. Enter the passcode in Settings → AI gateway passcode.'
    });
  }

  // Forward to Anthropic
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-6',
        max_tokens: Math.min(Number(max_tokens) || 1800, 4000),
        system: system || '',
        messages
      })
    });

    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(r.status).json({
        error: (j.error && j.error.message) || (`Anthropic ${r.status}`)
      });
    }

    return res.status(200).json(j);
  } catch (e) {
    return res.status(502).json({ error: 'Gateway error: ' + e.message });
  }
});

// Save Email Endpoint
app.post('/api/save-email', async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQYNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';

  const { emailId, hospitalId, subject, from, summary, body } = req.body;

  if (!emailId || !hospitalId) {
    return res.status(400).json({
      error: 'Missing required fields: emailId, hospitalId'
    });
  }

  try {
    const emailData = {
      email_id: emailId,
      hospital_id: hospitalId,
      subject: subject || '',
      from_address: from || '',
      summary: summary || '',
      body: body ? body.substring(0, 50000) : '',
      saved_at: new Date().toISOString(),
    };

    console.log('Attempting to save email:', emailData);

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/ingested_emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(emailData),
      }
    );

    const responseText = await response.text();
    console.log(`Supabase response: ${response.status}`, responseText);

    if (!response.ok) {
      // If table doesn't exist, create it first
      if (response.status === 400 || response.status === 404 || responseText.includes('relation') || responseText.includes('does not exist')) {
        console.log('Table may not exist, attempting to create it...');
        // Try to create the table via a simple insert that will create the table
        // For now, just inform the user
        return res.status(400).json({
          success: false,
          message: 'Supabase table needs to be initialized. Please ensure the ingested_emails table exists.',
          error: responseText,
          note: 'Run the migration script or contact your database administrator'
        });
      }

      return res.status(response.status).json({
        success: false,
        message: 'Failed to save email association to Supabase',
        error: responseText,
      });
    }

    const result = response.status === 201 ? await response.json() : { success: true };

    return res.status(201).json({
      success: true,
      message: 'Email saved to hospital successfully',
      data: result,
    });
  } catch (error) {
    console.error('Save email error:', error);

    return res.status(500).json({
      error: 'Failed to save email',
      message: error.message,
    });
  }
});

// Email Inbound Endpoint
app.post('/api/inbound', async (req, res) => {
  const INBOUND_SECRET = process.env.INBOUND_SECRET || 'medstar-inbox-2026';
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQYNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const [scheme, credentials] = authHeader.split(' ');

  if (scheme !== 'Bearer' || credentials !== INBOUND_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { from, to, subject, text, html } = req.body;

  if (!from || !to || !subject) {
    return res.status(400).json({
      error: 'Missing required fields: from, to, subject'
    });
  }

  try {
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
          data: JSON.stringify({ from, to, subject, text, html }),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`Supabase error: ${response.status}`, error);

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
});

// Serve static HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'universe.html'));
});

// Catch-all for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'universe.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Work Universe running on port ${PORT}`);
});
