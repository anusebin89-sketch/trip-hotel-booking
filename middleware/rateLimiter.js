const LRU = new Map();
// Simple rate limiter: max 5 requests per minute per key (IP or session)
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;

function rateLimiter(req, res, next) {
  const key = req.session?.userId ? `uid:${req.session.userId}` : `ip:${req.ip}`;
  const now = Date.now();
  const entry = LRU.get(key) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 1;
    entry.start = now;
  } else {
    entry.count += 1;
  }
  LRU.set(key, entry);
  if (entry.count > MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

module.exports = { rateLimiter };
