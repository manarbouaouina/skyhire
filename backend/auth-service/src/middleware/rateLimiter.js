// auth-service/src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Strict rate limiter for login endpoint (10 requests per minute)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many login attempts, please try again after a minute'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    // Log rate limit violations
    console.warn('Rate limit exceeded:', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts, please try again after a minute',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.ceil(Date.now() / 1000)
    });
  },
  skipSuccessfulRequests: false, // Count all requests, including successful ones
  skipFailedRequests: false // Count all requests, including failed ones
});

// Rate limiter for signup endpoint (5 requests per 15 minutes)
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many signup attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn('Rate limit exceeded (signup):', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many signup attempts, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.ceil(Date.now() / 1000)
    });
  }
});

// Rate limiter for password change (5 requests per hour)
const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: {
    status: 'error',
    message: 'Too many password change attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn('Rate limit exceeded (password change):', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many password change attempts, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.ceil(Date.now() / 1000)
    });
  }
});

// General rate limiter for other auth endpoints (100 requests per 15 minutes)
const generalAuthLimiter = rateLimit({
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
  loginLimiter,
  signupLimiter,
  passwordChangeLimiter,
  generalAuthLimiter
};

