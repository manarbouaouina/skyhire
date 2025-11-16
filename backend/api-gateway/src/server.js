const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// General API rate limiter (1000 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn('API Gateway rate limit exceeded:', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(429).json({
      status: 'error',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) - Math.ceil(Date.now() / 1000)
    });
  }
});

const targets = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  USER: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  CV: process.env.CV_SERVICE_URL || 'http://localhost:5003',
  INTERVIEW: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:5004',
  JOBS: process.env.JOBS_SERVICE_URL || 'http://localhost:5005',
  CHAT: process.env.CHAT_SERVICE_URL || 'http://localhost:5006',
  NOTIFICATIONS: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:5007',
  AERONAUTICS: process.env.AERONAUTICS_SERVICE_URL || 'http://localhost:8000'
};

app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(morgan('dev'));

// Apply general rate limiting to all API routes
app.use('/api', apiLimiter);

const mkProxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  ws: true,
  logLevel: 'warn',
  cookieDomainRewrite: false, // Preserve cookie domain
  onProxyReq: (proxyReq, req, res) => {
    // Forward cookies from client to service
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Forward cookies from service to client
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
        // Ensure cookies work with the client origin
        return cookie.replace(/Domain=[^;]+/gi, '');
      });
    }
  }
});

app.get('/api/health', async (req, res) => {
  const services = [
    { name: 'auth', url: `${targets.AUTH}/api/health` },
    { name: 'users', url: `${targets.USER}/api/health` },
    { name: 'cv', url: `${targets.CV}/api/health` },
    { name: 'interview', url: `${targets.INTERVIEW}/api/health` },
    { name: 'jobs', url: `${targets.JOBS}/api/health` },
    { name: 'chat', url: `${targets.CHAT}/api/health` },
    { name: 'notifications', url: `${targets.NOTIFICATIONS}/api/health` },
    { name: 'aero', url: `${targets.AERONAUTICS}/health` }
  ];
  const results = await Promise.allSettled(services.map(s => axios.get(s.url).then(r => ({ name: s.name, ok: true, data: r.data })).catch(e => ({ name: s.name, ok: false, error: e.message }))));
  const payload = results.reduce((acc, r, i) => { const name = services[i].name; acc[name] = r.value || { ok: false }; return acc; }, {});
  res.json({ gateway: { ok: true, timestamp: new Date() }, services: payload });
});

app.use('/api/auth', mkProxy(targets.AUTH));
app.use('/api/users', mkProxy(targets.USER));
app.use('/api/cv', mkProxy(targets.CV));
app.use('/api/interview', mkProxy(targets.INTERVIEW));
app.use('/api/jobs', mkProxy(targets.JOBS));
app.use('/api/chat', mkProxy(targets.CHAT));
app.use('/api/notifications', mkProxy(targets.NOTIFICATIONS));
// Aeronautics chatbot expects bare paths like /chat, not /api/aero/chat
app.use('/api/aero', createProxyMiddleware({
  target: targets.AERONAUTICS,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/api/aero': '' },
  logLevel: 'warn',
  cookieDomainRewrite: false,
  onProxyReq: (proxyReq, req, res) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
        return cookie.replace(/Domain=[^;]+/gi, '');
      });
    }
  }
}));
// Match API proxy - routes /api/match to resume-match service
app.use('/api/match', createProxyMiddleware({
  target: targets.AERONAUTICS,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/api/match': '/api/v1/resume-match' },
  logLevel: 'warn',
  cookieDomainRewrite: false,
  onProxyReq: (proxyReq, req, res) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('Cookie', req.headers.cookie);
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    if (proxyRes.headers['set-cookie']) {
      proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(cookie => {
        return cookie.replace(/Domain=[^;]+/gi, '');
      });
    }
  }
}));

app.use('/uploads', mkProxy(targets.CV));

const chatWsProxy = createProxyMiddleware({
  target: targets.CHAT,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/socket.io/chat': '/socket.io' },
  logLevel: 'warn'
});
app.use('/socket.io/chat', chatWsProxy);

const interviewWsProxy = createProxyMiddleware({
  target: targets.INTERVIEW,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/socket.io/interview': '/socket.io' },
  logLevel: 'warn'
});
app.use('/socket.io/interview', interviewWsProxy);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  next();
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Gateway error' });
});

const server = http.createServer(app);
server.on('upgrade', (req, socket, head) => {
  try {
    if (req.url && req.url.startsWith('/socket.io/chat')) {
      return chatWsProxy.upgrade(req, socket, head);
    }
    if (req.url && req.url.startsWith('/socket.io/interview')) {
      return interviewWsProxy.upgrade(req, socket, head);
    }
  } catch (e) {
    try { socket.destroy(); } catch (_) {}
  }
});
server.listen(PORT, () => {
  console.log(`API Gateway listening on port ${PORT}`);
});
