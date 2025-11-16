# JWT Authentication & Google OAuth 2.0 Implementation Summary

## Overview

This document summarizes the implementation of secure Google OAuth 2.0 login and JWT-based session management for the SkyHire API routes.

## What Was Implemented

### 1. Google OAuth 2.0 Integration

- **Passport.js Configuration**: Configured Passport.js with Google OAuth 2.0 strategy
- **OAuth Routes**: Added routes for Google authentication:
  - `GET /api/auth/google` - Initiates Google OAuth flow
  - `GET /api/auth/google/callback` - Handles OAuth callback
  - `GET /api/auth/google/failure` - Handles OAuth failures
- **User Model Updates**: Extended User model to support Google OAuth with `googleId` field
- **Account Linking**: Automatically links Google accounts to existing users by email

### 2. JWT Token Management

- **HTTP-Only Cookies**: JWT tokens are now stored in HTTP-only cookies for enhanced security
- **Cookie Configuration**:
  - `httpOnly: true` - Prevents JavaScript access
  - `secure: true` in production - HTTPS only
  - `sameSite: 'lax'` - CSRF protection
  - 7-day expiration
- **Backward Compatibility**: Tokens are still returned in response body for backward compatibility

### 3. Protected Route Authentication

All protected routes now check for JWT tokens in two ways:
1. **Authorization Header**: `Bearer <token>` (existing method)
2. **HTTP-Only Cookie**: `auth_token` cookie (new method)

**Updated Services:**
- ✅ Auth Service
- ✅ CV Service (`/api/cv`)
- ✅ Job Service
- ✅ User Service
- ✅ Interview Service
- ✅ Chat Service
- ✅ Notifications Service

### 4. API Gateway Updates

- **Cookie Forwarding**: API Gateway now properly forwards cookies between client and services
- **Match API Route**: Added `/api/match` proxy route that routes to `/api/v1/resume-match` service
- **CORS Configuration**: Updated to allow credentials for cookie support

## File Changes

### Auth Service
- `backend/auth-service/src/config/passport.js` - New Passport configuration
- `backend/auth-service/src/config/jwt.js` - Added cookie management functions
- `backend/auth-service/src/controllers/authController.js` - Added Google OAuth handlers
- `backend/auth-service/src/routes/authRoutes.js` - Added OAuth routes
- `backend/auth-service/src/middleware/auth.js` - Updated to check cookies
- `backend/auth-service/src/models/User.js` - Added `googleId` field
- `backend/auth-service/src/server.js` - Added Passport and cookie-parser

### Other Services
All services were updated to:
- Install `cookie-parser` package
- Add cookie-parser middleware
- Update CORS to allow credentials
- Update auth middleware to check cookies

### API Gateway
- `backend/api-gateway/src/server.js` - Updated proxy middleware to forward cookies

## Environment Variables

Create a `.env` file in `backend/auth-service/` with:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/skyhire-auth

# Server Configuration
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_EXPIRES_IN=7d
JWT_COOKIE_NAME=auth_token

# Google OAuth 2.0 Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# User Service URL
USER_SERVICE_URL=http://localhost:5002
```

**Important**: All services should use the same `JWT_SECRET` and `JWT_COOKIE_NAME` values.

## Testing

### 1. Test Google OAuth Login

```bash
# Start the auth service
cd backend/auth-service
npm run dev

# Navigate to (or use curl):
http://localhost:5001/api/auth/google
```

This will redirect to Google's login page. After authentication, you'll be redirected back with a JWT token stored in a cookie.

### 2. Test Protected Routes

```bash
# Test CV route (requires authentication)
curl -X GET http://localhost:5000/api/cv \
  -H "Cookie: auth_token=<your_jwt_token>" \
  --cookie-jar cookies.txt

# Or with Authorization header (backward compatible)
curl -X GET http://localhost:5000/api/cv \
  -H "Authorization: Bearer <your_jwt_token>"
```

### 3. Test Match API Route

```bash
# Test match API (proxied to resume-match service)
curl -X GET http://localhost:5000/api/match \
  -H "Cookie: auth_token=<your_jwt_token>"
```

### 4. Test Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Cookie: auth_token=<your_jwt_token>"
```

## API Endpoints

### Authentication Endpoints
- `GET /api/auth/google` - Start Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback (automatic)
- `POST /api/auth/login` - Standard email/password login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - Logout and clear cookie
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Protected Routes
All routes below require valid JWT (in cookie or Authorization header):
- `/api/cv/*` - CV management
- `/api/match/*` - Resume matching (proxied to Python service)
- `/api/jobs/*` - Job management
- `/api/users/*` - User profiles
- `/api/interview/*` - Interview management
- `/api/chat/*` - Chat functionality
- `/api/notifications/*` - Notifications

## Security Features

1. **HTTP-Only Cookies**: Prevents XSS attacks by making cookies inaccessible to JavaScript
2. **Secure Cookies**: In production, cookies are only sent over HTTPS
3. **SameSite Protection**: Reduces CSRF attack risk
4. **Token Expiration**: JWT tokens expire after 7 days
5. **Account Linking**: Google accounts are automatically linked to existing accounts by email

## Next Steps

1. **Configure Google OAuth**: Follow the guide in `backend/auth-service/GOOGLE_OAUTH_SETUP.md`
2. **Set Environment Variables**: Create `.env` files for all services
3. **Test Authentication**: Test both Google OAuth and standard login
4. **Update Frontend**: Update frontend to handle cookie-based authentication
5. **Production Deployment**: 
   - Use HTTPS
   - Set secure cookie flags
   - Use strong, unique JWT secrets
   - Update OAuth callback URLs

## Troubleshooting

### Cookies Not Being Set
- Check CORS configuration allows credentials
- Verify `CLIENT_URL` matches your frontend URL
- Ensure you're accessing via the correct origin

### "Invalid token" Errors
- Verify all services use the same `JWT_SECRET`
- Check token hasn't expired
- Ensure cookie name matches (`JWT_COOKIE_NAME`)

### OAuth Redirect Errors
- Verify callback URL in Google Console matches `.env` exactly
- Check for trailing slashes
- Ensure protocol matches (http vs https)

## Dependencies Added

- `passport` - Authentication middleware
- `passport-google-oauth20` - Google OAuth strategy
- `cookie-parser` - Cookie parsing middleware (all services)

