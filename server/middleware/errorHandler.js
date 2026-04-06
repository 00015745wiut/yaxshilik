const isDev = process.env.NODE_ENV !== 'production';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();

  // Always log the full error server-side
  console.error(`[${timestamp}] ${req.method} ${req.originalUrl} — ${err.message}`);
  if (isDev) console.error(err.stack);

  // Multer file errors (wrong type / size)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large. Maximum size is 5 MB.' });
  }
  if (err.message && err.message.startsWith('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }

  // JWT errors forwarded explicitly
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // PostgreSQL unique-violation (code 23505)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with that value already exists.' });
  }

  // Generic handler
  const status  = err.status || err.statusCode || 500;
  const message = isDev ? err.message : 'Something went wrong. Please try again later.';
  const body    = isDev ? { error: message, stack: err.stack } : { error: message };

  return res.status(status).json(body);
}

module.exports = errorHandler;
