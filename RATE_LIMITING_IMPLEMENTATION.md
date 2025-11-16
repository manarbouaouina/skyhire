# Rate Limiting Implementation

## Overview

This document summarizes the implementation of rate limiting using `express-rate-limit` to prevent brute force attacks, DDoS attacks, and protect API endpoints from abuse.

## What Was Implemented

### 1. Auth Service Rate Limiting

**Login Endpoint** (`/api/auth/login`):
- **Limit**: 10 requests per minute per IP
- **Window**: 60 seconds
- **Purpose**: Prevent brute force attacks on login

**Signup Endpoint** (`/api/auth/signup`):
- **Limit**: 5 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Purpose**: Prevent spam account creation

**Password Change Endpoint** (`/api/auth/change-password`):
- **Limit**: 5 requests per hour per IP
- **Window**: 60 minutes
- **Purpose**: Prevent password brute forcing

**General Auth Endpoints**:
- **Limit**: 100 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Applied to**: Profile, logout, Google OAuth

### 2. CV Service Rate Limiting

**CV Upload Endpoint** (`/api/cv/upload`):
- **Limit**: 5 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Purpose**: Prevent abuse of file upload system

**Avatar Upload Endpoint** (`/api/cv/avatar`):
- **Limit**: 10 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Purpose**: Prevent avatar upload abuse

**General CV Endpoints**:
- **Limit**: 100 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Applied to**: Get CVs, CV analysis, roadmap, delete

### 3. API Gateway Rate Limiting

**General API Limiter**:
- **Limit**: 1000 requests per 15 minutes per IP
- **Window**: 15 minutes
- **Purpose**: Overall DDoS protection at gateway level
- **Applied to**: All `/api/*` routes

## Rate Limit Configuration

### Response Headers

When rate limiting is active, responses include:
- `RateLimit-Limit`: Maximum number of requests allowed
- `RateLimit-Remaining`: Number of requests remaining
- `RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

### Error Response

When rate limit is exceeded (HTTP 429):
```json
{
  "status": "error",
  "message": "Too many login attempts, please try again after a minute",
  "retryAfter": 45
}
```

The `retryAfter` field indicates seconds until the rate limit resets.

## Testing Rate Limiting

### Test Login Rate Limit (10 req/min)

```bash
# Send 11 requests rapidly
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123"}' \
    -w "\nStatus: %{http_code}\n"
  sleep 0.5
done
```

**Expected Result:**
- First 10 requests: 401 (Unauthorized) or 400 (Validation error)
- 11th request: 429 (Too Many Requests)

### Test Signup Rate Limit (5 req/15min)

```bash
# Send 6 requests rapidly
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/signup \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test User $i\",\"email\":\"test$i@example.com\",\"password\":\"test123456\"}" \
    -w "\nStatus: %{http_code}\n"
  sleep 0.5
done
```

**Expected Result:**
- First 5 requests: 201 (Created) or 400 (Validation error)
- 6th request: 429 (Too Many Requests)

### Test CV Upload Rate Limit (5 req/15min)

```bash
# Create a dummy file first
echo "Test CV content" > test_cv.txt

# Send 6 requests rapidly (requires authentication)
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/cv/upload \
    -H "Authorization: Bearer <your_token>" \
    -F "cv=@test_cv.txt" \
    -w "\nStatus: %{http_code}\n"
  sleep 0.5
done
```

**Expected Result:**
- First 5 requests: 201 (Created) or 400 (Validation error)
- 6th request: 429 (Too Many Requests)

### Test API Gateway Rate Limit (1000 req/15min)

```bash
# Send 1001 requests rapidly
for i in {1..1001}; do
  curl -X GET http://localhost:5000/api/health \
    -w "\nStatus: %{http_code}\n" \
    -o /dev/null -s
  if [ $((i % 100)) -eq 0 ]; then
    echo "Sent $i requests..."
  fi
done
```

**Expected Result:**
- First 1000 requests: 200 (OK)
- 1001st request: 429 (Too Many Requests)

## Rate Limit Logging

All rate limit violations are logged with:
- Request path
- HTTP method
- Client IP address
- Timestamp

Example log entry:
```
Rate limit exceeded: {
  path: '/api/auth/login',
  method: 'POST',
  ip: '::1',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

## Configuration Details

### Auth Service Rate Limiters

**Location**: `backend/auth-service/src/middleware/rateLimiter.js`

- `loginLimiter`: 10 req/min
- `signupLimiter`: 5 req/15min
- `passwordChangeLimiter`: 5 req/hour
- `generalAuthLimiter`: 100 req/15min

### CV Service Rate Limiters

**Location**: `backend/cv-service/src/middleware/rateLimiter.js`

- `uploadLimiter`: 5 req/15min
- `avatarUploadLimiter`: 10 req/15min
- `generalCVLimiter`: 100 req/15min

### API Gateway Rate Limiter

**Location**: `backend/api-gateway/src/server.js`

- `apiLimiter`: 1000 req/15min (applied to all `/api/*` routes)

## Production Considerations

### 1. Redis Store (Recommended)

For production, use Redis to share rate limit state across multiple server instances:

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const loginLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:login:'
  }),
  windowMs: 60 * 1000,
  max: 10
});
```

### 2. Whitelist Trusted IPs

```javascript
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: (req) => {
    // Skip rate limiting for trusted IPs
    const trustedIPs = ['127.0.0.1', '::1'];
    return trustedIPs.includes(req.ip);
  }
});
```

### 3. Adjust Limits Based on Traffic

Monitor your API usage and adjust limits:
- Increase limits for high-traffic endpoints
- Decrease limits for sensitive endpoints
- Use different limits for authenticated vs unauthenticated users

### 4. Rate Limit Headers

The implementation uses `standardHeaders: true` which provides:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Reset time (Unix timestamp)

### 5. Error Handling

Rate limit errors return:
- HTTP Status: 429 (Too Many Requests)
- JSON response with error message
- `retryAfter` field indicating seconds until reset

## Security Benefits

1. **Brute Force Protection**: Login endpoint protected from password guessing
2. **DDoS Mitigation**: Gateway-level rate limiting prevents overwhelming the API
3. **Resource Protection**: Upload endpoints protected from abuse
4. **Account Creation Spam**: Signup endpoint prevents mass account creation
5. **Password Reset Abuse**: Password change endpoint protected

## Monitoring

Monitor rate limit violations:
- Log all 429 responses
- Track IPs that frequently hit rate limits
- Alert on unusual patterns (potential attacks)
- Review rate limit logs regularly

## Files Modified

### Auth Service
- `src/middleware/rateLimiter.js` - Rate limiting configurations
- `src/routes/authRoutes.js` - Applied rate limiters to routes

### CV Service
- `src/middleware/rateLimiter.js` - Rate limiting configurations
- `src/routes/cvRoutes.js` - Applied rate limiters to routes

### API Gateway
- `src/server.js` - Added general API rate limiter

## Testing Checklist

- [x] Login endpoint: 10 req/min limit
- [x] Signup endpoint: 5 req/15min limit
- [x] CV upload: 5 req/15min limit
- [x] API Gateway: 1000 req/15min limit
- [x] 429 status code returned when limit exceeded
- [x] Rate limit headers present in responses
- [x] Rate limit violations logged
- [x] Error messages include retryAfter

## Next Steps

1. **Monitor**: Track rate limit violations in production
2. **Tune**: Adjust limits based on actual usage patterns
3. **Redis**: Implement Redis store for multi-instance deployments
4. **Whitelist**: Add trusted IP whitelisting if needed
5. **Alerting**: Set up alerts for high rate limit violation rates

