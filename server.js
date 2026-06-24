const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
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

// Email AI Action Endpoints
app.post('/api/email-action', async (req, res) => {
  const { action, emailId, emailBody, emailSubject, emailFrom } = req.body;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'Server missing ANTHROPIC_API_KEY' });
  }

  if (!action || !emailBody) {
    return res.status(400).json({ error: 'Missing action or emailBody' });
  }

  try {
    let systemPrompt = '';
    let userPrompt = '';

    const emailContext = `EMAIL DETAILS:
From: ${emailFrom || 'Unknown'}
Subject: ${emailSubject || 'No subject'}
Body: ${emailBody}`;

    switch (action) {
      case 'summarize':
        systemPrompt = 'You are an expert email analyst. Extract key points and summarize emails concisely.';
        userPrompt = `${emailContext}\n\nProvide a bullet-point summary of the key points, decisions, and action items in this email. Be concise (3-5 points max).`;
        break;

      case 'escalate':
        systemPrompt = 'You are a priority assessment expert. Determine if emails need escalation and why.';
        userPrompt = `${emailContext}\n\nAnalyze if this email requires immediate escalation. Respond with: ESCALATE YES/NO and a brief explanation of priority level and who should be notified.`;
        break;

      case 'infer':
        systemPrompt = 'You are an inferential analyst. Determine what must happen based on email content.';
        userPrompt = `${emailContext}\n\nWhat must happen next based on this email? What actions are implied but not explicit? Provide 2-3 key inferences.`;
        break;

      case 'intent':
        systemPrompt = 'You are an intent analyzer. Determine what the sender is truly asking for.';
        userPrompt = `${emailContext}\n\nWhat is the sender really asking for? Summarize their core intent in 1-2 sentences. Then list any implicit requests or concerns.`;
        break;

      case 'reply':
        systemPrompt = 'You are a professional email writer. Draft direct, clear responses.';
        userPrompt = `${emailContext}\n\nDraft a professional reply email. Be direct, concise, and professional. No bullet points. Keep it to 2-3 short paragraphs.`;
        break;

      case 'commit':
        systemPrompt = 'You are an action item creator. Extract concrete, trackable action items.';
        userPrompt = `${emailContext}\n\nCreate a list of specific, trackable action items from this email. Format each as: [PRIORITY] ACTION DESCRIPTION - OWNER (if implied). Include deadline if mentioned.`;
        break;

      default:
        return res.status(400).json({ error: 'Unknown action: ' + action });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: (result.error && result.error.message) || `Anthropic API error: ${response.status}`
      });
    }

    const content = result.content && result.content[0];
    const text = content && content.type === 'text' ? content.text : 'No response';

    return res.status(200).json({
      success: true,
      action,
      result: text
    });
  } catch (e) {
    console.error('Email action error:', e);
    return res.status(500).json({ error: 'Failed to process email action: ' + e.message });
  }
});

// Save Email Endpoint
app.post('/api/save-email', async (req, res) => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQYNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';

  const WORKSPACE_KEY = process.env.WORKSPACE_KEY || 'twiney-execos-mGJ7Yk9Lp2RnDqW8sZ4eXbHvC3FaTu6N';

  const { emailId, hospitalId, subject, from, summary, body } = req.body;

  if (!emailId || !hospitalId) {
    return res.status(400).json({
      error: 'Missing required fields: emailId, hospitalId'
    });
  }

  // The ingested_emails table stores email_id/hospital_id as Postgres uuid columns.
  // The app's internal record ids (e.g. "em-test-001", "hosp-mwhc") are NOT uuids,
  // so inserting them into the uuid columns causes Postgres error 22P02 -> HTTP 400.
  // Fix: only place a value in the uuid columns when it is a valid uuid; otherwise
  // store the app id in the text columns (hospital_code / message_id) so the
  // association is preserved and the insert succeeds.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v.trim());

  try {
    const emailData = {
      // workspace_key is NOT NULL in the schema; omitting it caused 23502 errors.
      workspace_key: WORKSPACE_KEY,
      // Route ids to the correct column based on type.
      email_id: isUuid(emailId) ? emailId : null,
      hospital_id: isUuid(hospitalId) ? hospitalId : null,
      // Always keep the app's string identifiers in text columns for the association.
      hospital_code: hospitalId,
      message_id: emailId,
      subject: subject || '',
      from_address: from || '',
      summary: summary || '',
      body: body ? body.substring(0, 50000) : '',
      status: 'saved',
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
      // Surface the real Supabase error instead of masking it as a generic 400.
      console.error(`[save-email] Supabase ${response.status}: ${responseText}`);
      return res.status(response.status === 404 ? 500 : response.status).json({
        success: false,
        message: 'Failed to save email association to Supabase',
        error: responseText,
      });
    }

    // responseText was already read above; parse it instead of re-reading the body
    // (calling response.json() here throws "Body has already been read").
    let result = { success: true };
    if (responseText) {
      try { result = JSON.parse(responseText); } catch (_) { /* non-JSON body, keep default */ }
    }

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
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
  // Always use anon key — service role key is invalid; anon key + RLS insert policy handles auth
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQYNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (token !== INBOUND_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { from, to, subject, text, html } = req.body;

  if (!from || !subject) {
    return res.status(400).json({ error: 'Missing required fields: from, subject' });
  }

  console.log(`[INBOUND] Storing email from=${from} subject="${subject}"`);

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/ingested_emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        // Use actual column names from schema: from_address, to_address, subject, body, workspace_key
        body: JSON.stringify({
          from_address: from,
          to_address: to || null,
          subject,
          body: text || html || null,
          workspace_key: 'keraos',
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[INBOUND] Supabase error ${response.status}: ${errText}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to store email in Supabase',
        supabase_error: errText,
        supabase_status: response.status,
      });
    }

    console.log(`[INBOUND] Email stored successfully from=${from}`);
    return res.status(200).json({ success: true, message: 'Email ingested successfully' });

  } catch (error) {
    console.error('[INBOUND] Exception:', error.message);
    return res.status(500).json({ error: 'Failed to ingest email', message: error.message });
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

// Start the server only when run directly (local dev / Render).
// On Vercel the file is imported as a module, so listen() must be skipped there.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Work Universe running on port ${PORT}`);
  });
}

// Export the Express app so Vercel's @vercel/node runtime handles requests.
// Without this, /api/anthropic returns 404 on Vercel ("gateway not deployed").
module.exports = app;
