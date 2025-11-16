# Google OAuth 2.0 Setup Guide

This guide explains how to configure Google OAuth 2.0 authentication for the SkyHire application.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. Access to the Google Cloud Console

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** (unless you have a Google Workspace)
   - Fill in the required information (App name, User support email, Developer contact)
   - Add scopes: `profile` and `email`
   - Add test users if needed (for development)

## Step 2: Configure OAuth Client

1. Choose **Web application** as the application type
2. Add **Authorized JavaScript origins**:
   - `http://localhost:5001` (for development)
   - `http://localhost:3000` (for frontend)
   - Your production URLs (when deploying)
3. Add **Authorized redirect URIs**:
   - `http://localhost:5001/api/auth/google/callback`
   - Your production callback URL (when deploying)
4. Click **Create**
5. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Environment Variables

Create a `.env` file in `backend/auth-service/` with the following variables:

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

# User Service URL (for auto-creating profiles)
USER_SERVICE_URL=http://localhost:5002
```

Replace the placeholder values with your actual credentials.

## Step 4: Test the Implementation

1. Start the auth service:
   ```bash
   cd backend/auth-service
   npm run dev
   ```

2. Test Google OAuth login:
   - Navigate to: `http://localhost:5001/api/auth/google`
   - You should be redirected to Google's login page
   - After authentication, you'll be redirected back with a JWT token stored in an HTTP-only cookie

## API Endpoints

- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback (handled automatically)
- `POST /api/auth/logout` - Logout and clear JWT cookie

## Security Notes

1. **Never commit** your `.env` file to version control
2. Use strong, unique values for `JWT_SECRET` in production
3. Ensure `GOOGLE_CLIENT_SECRET` is kept secure
4. In production, use HTTPS and set `secure: true` for cookies
5. Update `CLIENT_URL` and callback URLs for your production domain

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure the callback URL in your `.env` matches exactly what's configured in Google Console
   - Check for trailing slashes and protocol (http vs https)

2. **"Invalid token" errors**
   - Verify `JWT_SECRET` is set correctly
   - Ensure all services use the same `JWT_SECRET`

3. **Cookies not being set**
   - Check CORS configuration allows credentials
   - Verify `CLIENT_URL` matches your frontend URL
   - In development, ensure you're accessing via the correct origin

## Production Deployment

When deploying to production:

1. Update all URLs to use HTTPS
2. Set `NODE_ENV=production`
3. Use a secure, randomly generated `JWT_SECRET`
4. Update Google OAuth credentials with production URLs
5. Configure proper CORS origins
6. Enable secure cookies (`secure: true` in cookie options)

