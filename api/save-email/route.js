const express = require('express');
const router = express.Router();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://kfkjagottniayrxayeav.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma2phZ290dG5pYXlyeGF5ZWF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTEwMjksImV4cCI6MjA5NDk4NzAyOX0.OGQYNdzWTM51RRFintWgN7RUmUjpzC2YhLAxgRP25gA';

  const { emailId, hospitalId, subject, from, summary, body } = req.body;

  if (!emailId || !hospitalId) {
    return res.status(400).json({
      error: 'Missing required fields: emailId, hospitalId'
    });
  }

  try {
    // First, check if the ingested_emails table exists and has the hospital_id column
    // If not, we'll create/update it
    
    // Save the email-hospital association to ingested_emails table
    const emailData = {
      email_id: emailId,
      hospital_id: hospitalId,
      subject: subject || '',
      from_address: from || '',
      summary: summary || '',
      body: body ? body.substring(0, 50000) : '',
      saved_at: new Date().toISOString(),
    };

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

    if (!response.ok) {
      const error = await response.text();
      console.error(`Supabase error: ${response.status}`, error);

      return res.status(response.status).json({
        success: false,
        message: 'Failed to save email association to Supabase',
        supabase_error: error,
        supabase_status: response.status,
      });
    }

    const result = await response.json();

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
};
