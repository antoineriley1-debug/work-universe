module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  console.log('[INBOUND] Request received', {
    method: req.method,
    url: req.url,
    auth: req.headers?.authorization?.substring(0, 20)
  });

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'POST only' }));
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();

  if (token !== 'medstar-inbox-2026') {
    console.log('[INBOUND] Bad token:', token.substring(0, 10));
    res.statusCode = 401;
    return res.end(JSON.stringify({ error: 'Bad token' }));
  }

  console.log('[INBOUND] Auth passed');
  
  try {
    const body = req.body;
    console.log('[INBOUND] Body:', { type: typeof body, keys: body ? Object.keys(body) : 'null' });

    if (!body || typeof body !== 'object') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Bad body' }));
    }

    const { from, to, subject } = body;
    if (!from || !to || !subject) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ error: 'Missing fields' }));
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));

  } catch (err) {
    console.error('[INBOUND] Error:', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err.message }));
  }
};
