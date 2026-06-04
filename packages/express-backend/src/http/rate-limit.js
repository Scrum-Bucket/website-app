function getClientKey(req) {
  return (
    String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function createRateLimiter({
  keyGenerator = getClientKey,
  maxRequests = 30,
  message = "Too many requests. Please try again later.",
  windowMs = 60 * 1000,
} = {}) {
  const clients = new Map();

  return function rateLimiter(req, res, next) {
    // Keep a small per-client counter for the current time window
    const now = Date.now();
    const key = keyGenerator(req);
    const current = clients.get(key);

    if (!current || current.resetAt <= now) {
      clients.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > maxRequests) {
      res.setHeader("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
