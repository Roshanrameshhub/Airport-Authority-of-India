import { sendError } from '../utils/apiResponse.js';

/**
 * Lightweight in-memory rate limiting middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default 15 minutes)
 * @param {number} options.max - Max requests per window per IP (default 100)
 * @param {string} options.message - Custom error message
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = 'Too many requests from this IP. Please try again later.'
} = {}) => {
  const hits = new Map();

  // Cleanup interval to avoid memory leaks
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now - record.startTime > windowMs) {
        hits.delete(key);
      }
    }
  }, windowMs);

  if (interval.unref) {
    interval.unref();
  }

  return (req, res, next) => {
    // In test environment, allow high capacity
    if (process.env.NODE_ENV === 'test') {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max);
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const now = Date.now();

    let record = hits.get(ip);

    if (!record || now - record.startTime > windowMs) {
      record = {
        startTime: now,
        count: 1
      };
      hits.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetTime = Math.ceil((record.startTime + windowMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (record.count > max) {
      return sendError(res, message, 429);
    }

    next();
  };
};

export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Regional API rate limit exceeded. Please retry after a brief cooling period.'
});

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Access temporarily held for security.'
});
