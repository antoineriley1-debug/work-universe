module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  // Simple test response
  return res.status(200).json({
    received: true,
    method: req.method,
    headers_auth: req.headers?.authorization?.substring(0, 20),
    body_type: typeof req.body,
    body_keys: req.body ? Object.keys(req.body) : 'null'
  });
};
