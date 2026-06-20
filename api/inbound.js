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

    if (token !== 'medstar-inbox-2026') {
      res.statusCode = 401;
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    // Get body
    const body = req.body;
    
    if (!body || typeof body !== 'object') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ 
        error: 'Invalid body',
        type: typeof body
      }));
    }

    const { from, to, subject, text, html } = body;

    // Validate
    if (!from || !to || !subject) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        error: 'Missing fields',
        from: !!from,
        to: !!to,
        subject: !!subject
      }));
    }

    // Return success WITHOUT calling Supabase yet
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      message: 'Would be stored in Supabase',
      received: { from, to, subject }
    }));

  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
};
