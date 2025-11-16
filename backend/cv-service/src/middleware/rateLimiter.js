// cv-service/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Strict rate limiter for CV upload (5 requests per 15 minutes)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 uploads per 15 minutes
  message: {
    status: 'error',
    message: 'Too many upload attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    // Log rate limit violations
    console.warn('Rate limit exceeded (CV upload):', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many upload attempts, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.ceil(Date.now() / 1000)
    });
  },
  skipSuccessfulRequests: false,
  skipFailedRequests: false
});

// Rate limiter for avatar upload (10 requests per 15 minutes)
const avatarUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: {
    status: 'error',
    message: 'Too many avatar upload attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn('Rate limit exceeded (avatar upload):', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?.id,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many avatar upload attempts, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.ceil(Date.now() / 1000)
    });
  }
});

// General rate limiter for CV endpoints (100 requests per 15 minutes)
const generalCVLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  uploadLimiter,
  avatarUploadLimiter,
  generalCVLimiter
};

