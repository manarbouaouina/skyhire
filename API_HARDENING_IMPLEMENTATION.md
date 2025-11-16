# API Hardening & Input Validation Implementation

## Overview

This document summarizes the implementation of Helmet.js security headers and Joi input validation across all Express.js services in the SkyHire application.

## What Was Implemented

### 1. Helmet.js Security Headers

**All services now include:**
- Content Security Policy (CSP) headers
- XSS Protection
- Frame Options (Clickjacking protection)
- HSTS (HTTP Strict Transport Security)
- X-Content-Type-Options
- Referrer Policy
- And other security headers

**Services Updated:**
- ✅ Auth Service
- ✅ CV Service
- ✅ Job Service
- ✅ User Service
- ✅ Interview Service
- ✅ Chat Service
- ✅ Notifications Service
- ✅ API Gateway (already had Helmet)

### 2. Input Validation with Joi

**Validation schemas created for:**

#### Auth Service
- `signupSchema` - User registration validation
- `loginSchema` - Login validation
- `updateProfileSchema` - Profile update validation
- `changePasswordSchema` - Password change validation

#### Job Service
- `createJobSchema` - Job creation validation
- `updateJobSchema` - Job update validation
- `applyToJobSchema` - Job application validation

#### User Service
- `updateProfileSchema` - User profile update validation
- `addSkillSchema` - Skill addition validation

### 3. Validation Middleware

Created reusable validation middleware that:
- Validates request body against Joi schemas
- Logs validation errors with request details
- Returns structured error responses
- Strips unknown fields for security
- Sanitizes input data

## Security Headers Verification

### Using curl

```bash
# Check security headers
curl -I http://localhost:5001/api/health

# Expected headers:
# X-DNS-Prefetch-Control: off
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 0
# Content-Security-Policy: default-src 'self'; ...
# Strict-Transport-Security: max-age=15552000; includeSubDomains
```

### Using Browser DevTools

1. Open browser DevTools (F12)
2. Navigate to Network tab
3. Make a request to any API endpoint
4. Click on the request
5. Check Response Headers section
6. Look for security headers listed above

## Validation Examples

### Valid Request

```bash
# Signup with valid data
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepass123",
    "role": "candidate"
  }'
```

**Response:** 201 Created with user data

### Invalid Request

```bash
# Signup with invalid data
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "A",
    "email": "invalid-email",
    "password": "123"
  }'
```

**Response:** 400 Bad Request
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Name must be at least 2 characters"
    },
    {
      "field": "email",
      "message": "Please provide a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

## Validation Rules

### Auth Service

**Signup:**
- Name: 2-100 characters, required
- Email: Valid email format, required
- Password: 6-128 characters, required
- Role: candidate, recruiter, or admin (default: candidate)

**Login:**
- Email: Valid email format, required
- Password: Required

**Update Profile:**
- Name: 2-100 characters (optional)
- Bio: Max 1000 characters (optional)
- Location: Max 255 characters (optional)
- Phone: Valid phone format (optional)
- Languages: Array, max 10 items (optional)
- Skills: Array, max 50 items (optional)

**Change Password:**
- Current Password: Required
- New Password: 6-128 characters, required

### Job Service

**Create Job:**
- Title: 3-200 characters, required
- Company: 2-100 characters, required
- Location: 2-255 characters, required
- Category: Must be one of: flight-attendant, cabin-crew, pilot, ground-staff, management, technical
- Description: 50-10000 characters, required
- Salary: Object with min, max, currency, period, required
- Type: full-time, part-time, contract, internship (default: full-time)
- Experience: entry, mid, senior, executive (default: mid)

**Apply to Job:**
- Cover Letter: Max 5000 characters (optional)
- Answers: Array, max 20 items (optional)
- CV ID: Valid MongoDB ObjectId (optional)

### User Service

**Update Profile:**
- Headline: Max 200 characters (optional)
- Bio: Max 2000 characters (optional)
- Skills: Array, max 100 items (optional)
- Education: Array, max 20 items (optional)
- Experience: Array, max 50 items (optional)

**Add Skill:**
- Skill: 2-100 characters, required
- Level: beginner, intermediate, advanced, expert (default: intermediate)

## Error Logging

All validation errors are logged with:
- Request path
- HTTP method
- Validation errors
- Client IP address
- Timestamp

Example log entry:
```
Validation error: {
  path: '/api/auth/signup',
  method: 'POST',
  errors: [
    'Name must be at least 2 characters',
    'Please provide a valid email address'
  ],
  ip: '::1',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

## File Upload Validation

CV Service file uploads are validated by multer middleware:
- Allowed types: PDF, DOC, DOCX, JPG, JPEG, PNG
- Max file size: 5MB
- File type validation
- File size validation

## Testing

### Test Security Headers

```bash
# Test auth service
curl -I http://localhost:5001/api/health

# Test CV service
curl -I http://localhost:5003/api/health

# Test job service
curl -I http://localhost:5005/api/health
```

### Test Validation

```bash
# Test invalid signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"A","email":"invalid"}'

# Test invalid job creation
curl -X POST http://localhost:5000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"A","company":"B"}'

# Test invalid profile update
curl -X PUT http://localhost:5000/api/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"bio":"'$(python -c "print('x'*3000)")'"}'
```

## Security Features

1. **XSS Protection**: Helmet sets X-XSS-Protection header
2. **Clickjacking Protection**: X-Frame-Options prevents iframe embedding
3. **Content Type Sniffing Prevention**: X-Content-Type-Options: nosniff
4. **CSP**: Content Security Policy restricts resource loading
5. **Input Sanitization**: Joi strips unknown fields and validates types
6. **SQL Injection Prevention**: Input validation prevents malicious strings
7. **NoSQL Injection Prevention**: Joi validates and sanitizes all inputs
8. **Error Logging**: All validation failures are logged for security monitoring

## Production Considerations

1. **CSP Configuration**: Adjust CSP directives based on your frontend needs
2. **HSTS**: Ensure HTTPS is properly configured before enabling HSTS
3. **Rate Limiting**: Consider adding rate limiting for authentication endpoints
4. **Logging**: Set up centralized logging for validation errors
5. **Monitoring**: Monitor validation error rates for potential attacks

## Files Modified

### Auth Service
- `src/server.js` - Added Helmet
- `src/middleware/validate.js` - Validation middleware
- `src/validators/authValidators.js` - Validation schemas
- `src/routes/authRoutes.js` - Applied validation
- `src/controllers/authController.js` - Removed manual validation

### Job Service
- `src/server.js` - Added Helmet
- `src/middleware/validate.js` - Validation middleware
- `src/validators/jobValidators.js` - Validation schemas
- `src/routes/jobsRoutes.js` - Applied validation
- `src/controllers/jobsController.js` - Removed manual validation

### User Service
- `src/server.js` - Added Helmet
- `src/middleware/validate.js` - Validation middleware
- `src/validators/userValidators.js` - Validation schemas
- `src/routes/userRoutes.js` - Applied validation

### Other Services
- All services: Added Helmet to `src/server.js`

## Next Steps

1. **Test all endpoints** with valid and invalid data
2. **Monitor validation logs** for patterns indicating attacks
3. **Adjust CSP** if frontend requires external resources
4. **Add rate limiting** for sensitive endpoints
5. **Set up alerting** for high validation error rates

