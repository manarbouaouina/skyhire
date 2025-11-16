# Secrets Inventory - SkyHire Platform

This document lists all secrets, API keys, tokens, and sensitive credentials used across the SkyHire platform.

## 🔐 Secrets Managed by Vault

### API Keys
1. **GEMINI_API_KEY**
   - **Purpose**: Google Gemini AI API access
   - **Used in**: 
     - `job-matching/chatbot/gemini_client.py`
     - `Aeronautics_Chatbot--main/main.py`
     - `job-matching/test_gemini_integration.py`
   - **Vault Path**: `secret/skyhire/gemini/api_key`
   - **Fallback Env Var**: `GEMINI_API_KEY`

2. **ELEVEN_LABS_API_KEY**
   - **Purpose**: Eleven Labs text-to-speech API access
   - **Used in**: Not yet implemented
   - **Vault Path**: `secret/skyhire/elevenlabs/api_key`
   - **Fallback Env Var**: `ELEVEN_LABS_API_KEY`

### Authentication Secrets

3. **JWT_SECRET**
   - **Purpose**: JWT token signing and verification
   - **Used in**: 
     - `backend/auth-service/src/config/jwt.js`
     - `backend/*/src/middleware/auth.js` (all services)
     - `backend/*/src/sockets/*.js` (chat, interview services)
   - **Vault Path**: `secret/skyhire/auth/jwt_secret`
   - **Fallback Env Var**: `JWT_SECRET`
   - **Default**: `'your_jwt_secret'` (⚠️ CHANGE IN PRODUCTION)

4. **JWT_COOKIE_NAME**
   - **Purpose**: HTTP-only cookie name for JWT storage
   - **Used in**: All auth middleware files
   - **Vault Path**: Not stored in Vault (non-sensitive config)
   - **Fallback Env Var**: `JWT_COOKIE_NAME`
   - **Default**: `'auth_token'`

5. **JWT_EXPIRES_IN**
   - **Purpose**: JWT token expiration time
   - **Used in**: `backend/auth-service/src/config/jwt.js`
   - **Vault Path**: Not stored in Vault (non-sensitive config)
   - **Fallback Env Var**: `JWT_EXPIRES_IN`
   - **Default**: `'7d'`

### OAuth Credentials

6. **GOOGLE_CLIENT_ID**
   - **Purpose**: Google OAuth 2.0 client ID
   - **Used in**: `backend/auth-service/src/config/passport.js`
   - **Vault Path**: `secret/skyhire/auth/google_client_id`
   - **Fallback Env Var**: `GOOGLE_CLIENT_ID`

7. **GOOGLE_CLIENT_SECRET**
   - **Purpose**: Google OAuth 2.0 client secret
   - **Used in**: `backend/auth-service/src/config/passport.js`
   - **Vault Path**: `secret/skyhire/auth/google_client_secret`
   - **Fallback Env Var**: `GOOGLE_CLIENT_SECRET`

8. **GOOGLE_CALLBACK_URL**
   - **Purpose**: Google OAuth callback URL
   - **Used in**: `backend/auth-service/src/config/passport.js`
   - **Vault Path**: Not stored in Vault (non-sensitive config)
   - **Fallback Env Var**: `GOOGLE_CALLBACK_URL`
   - **Default**: `http://localhost:5001/api/auth/google/callback`

### Database Connection Strings

9. **MONGODB_URI**
   - **Purpose**: MongoDB connection string
   - **Used in**: All backend services (`src/server.js`)
   - **Vault Path**: `secret/skyhire/database/{service}/connection_string`
   - **Fallback Env Var**: `MONGODB_URI`
   - **Services**: auth, users, cv, jobs, chat, interview, notifications

### Encryption Keys

10. **ENCRYPTION_KEY**
    - **Purpose**: Data encryption key
    - **Used in**: `backend/auth-service/src/utils/encryption.js`
    - **Vault Path**: Not yet configured
    - **Fallback Env Var**: `ENCRYPTION_KEY`
    - **Default**: Randomly generated (⚠️ Should be stored in Vault)

11. **ENCRYPTION_KEY_DIR**
    - **Purpose**: Directory for encryption key files
    - **Used in**: `backend/auth-service/src/services/encryption.js`
    - **Vault Path**: Not stored in Vault (non-sensitive config)
    - **Fallback Env Var**: `ENCRYPTION_KEY_DIR`

12. **ENCRYPTION_KEY_ID**
    - **Purpose**: Current encryption key identifier
    - **Used in**: `backend/auth-service/src/services/encryption.js`
    - **Vault Path**: Not stored in Vault (non-sensitive config)
    - **Fallback Env Var**: `ENCRYPTION_KEY_ID`
    - **Default**: `'default'`

### Vault Configuration

13. **VAULT_ADDR**
    - **Purpose**: Vault server address
    - **Used in**: Vault client initialization
    - **Vault Path**: N/A (Vault configuration)
    - **Fallback Env Var**: `VAULT_ADDR`
    - **Default**: `'http://localhost:8200'`

14. **VAULT_TOKEN**
    - **Purpose**: Vault authentication token
    - **Used in**: Vault client initialization
    - **Vault Path**: N/A (Vault configuration)
    - **Fallback Env Var**: `VAULT_TOKEN`
    - **⚠️ CRITICAL**: Never commit to repository

15. **VAULT_MOUNT_PATH**
    - **Purpose**: Vault secrets mount path
    - **Used in**: Vault client initialization
    - **Vault Path**: N/A (Vault configuration)
    - **Fallback Env Var**: `VAULT_MOUNT_PATH`
    - **Default**: `'secret'`

16. **ENABLE_VAULT**
    - **Purpose**: Enable/disable Vault usage
    - **Used in**: Vault client initialization
    - **Vault Path**: N/A (Vault configuration)
    - **Fallback Env Var**: `ENABLE_VAULT`
    - **Default**: `'false'`

## 🔧 Configuration Variables (Non-Sensitive)

### Service URLs
- `AUTH_SERVICE_URL` - Default: `http://localhost:5001`
- `USER_SERVICE_URL` - Default: `http://localhost:5002`
- `CV_SERVICE_URL` - Default: `http://localhost:5003`
- `INTERVIEW_SERVICE_URL` - Default: `http://localhost:5004`
- `JOBS_SERVICE_URL` - Default: `http://localhost:5005`
- `CHAT_SERVICE_URL` - Default: `http://localhost:5006`
- `NOTIFICATIONS_SERVICE_URL` - Default: `http://localhost:5007`
- `AERONAUTICS_SERVICE_URL` - Default: `http://localhost:8000`

### Client Configuration
- `CLIENT_URL` - Default: `http://localhost:3000`
- `REACT_APP_API_URL` - Default: `http://localhost:5000`

### Server Configuration
- `PORT` - Service port numbers (5001-5007, 8000)
- `NODE_ENV` - Environment (development/production)

### Redis (Future)
- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port

## 📍 Secret Locations by File

### Backend Services

#### Auth Service
- `backend/auth-service/src/config/jwt.js`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
  - `JWT_COOKIE_NAME`
- `backend/auth-service/src/config/passport.js`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_CALLBACK_URL`
- `backend/auth-service/src/utils/encryption.js`
  - `ENCRYPTION_KEY`
- `backend/auth-service/src/services/encryption.js`
  - `ENCRYPTION_KEY_DIR`
  - `ENCRYPTION_KEY_ID`

#### All Services (Auth Middleware)
- `backend/*/src/middleware/auth.js`
  - `JWT_SECRET`
  - `JWT_COOKIE_NAME`

#### Socket Services
- `backend/chat-service/src/sockets/chatSocket.js`
  - `JWT_SECRET`
- `backend/interview-service/src/sockets/interviewSocket.js`
  - `JWT_SECRET`

#### Server Files
- `backend/*/src/server.js`
  - `MONGODB_URI`
  - `PORT`
  - `CLIENT_URL`

### Python Services

#### Job Matching Service
- `job-matching/chatbot/gemini_client.py`
  - `GEMINI_API_KEY`
- `job-matching/test_gemini_integration.py`
  - `GEMINI_API_KEY`
- `Aeronautics_Chatbot--main/main.py`
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL_NAME`

### Frontend
- `src/services/api.ts`
  - `REACT_APP_API_URL`
- `src/services/cvService.ts`
  - `REACT_APP_API_URL`
- `src/pages/ChatPage.tsx`
  - `REACT_APP_API_URL`

## 🔒 Security Status

### ✅ Secured (Using Vault)
- Gemini API Key
- Eleven Labs API Key
- JWT Secret
- Google OAuth Credentials
- MongoDB Connection Strings (via Secret Manager)

### ⚠️ Needs Migration to Vault
- `ENCRYPTION_KEY` - Currently using random generation or env var
- All service-specific MongoDB URIs should use Vault paths

### ✅ Non-Sensitive (OK in Env Vars)
- Service URLs
- Port numbers
- Client URLs
- Cookie names
- Expiration times

## 📝 Recommendations

1. **Migrate Encryption Key to Vault**
   ```bash
   vault kv put secret/skyhire/encryption encryption_key="your_encryption_key"
   ```

2. **Use Service-Specific MongoDB URIs**
   ```bash
   vault kv put secret/skyhire/database/auth connection_string="mongodb://..."
   vault kv put secret/skyhire/database/users connection_string="mongodb://..."
   # etc.
   ```

3. **Never Commit Secrets**
   - All `.env` files are gitignored
   - Use `.env.example` for documentation
   - Store real secrets only in Vault

4. **Rotate Secrets Regularly**
   - JWT secrets: Every 90 days
   - API keys: When compromised or quarterly
   - OAuth secrets: When rotated in provider console

5. **Use Different Secrets per Environment**
   - Development: Local Vault with dev tokens
   - Staging: Staging Vault with staging tokens
   - Production: Production Vault with production tokens

## 🔍 How to Find Secrets

### Search for Environment Variables
```bash
# Find all process.env usage
grep -r "process\.env\." backend/

# Find all os.getenv usage
grep -r "os\.getenv" job-matching/
```

### Check Vault
```bash
# List all secrets
vault kv list secret/skyhire

# Read a specific secret
vault kv get secret/skyhire/gemini
```

### Validate Secrets
```javascript
const { getSecretManager } = require('./backend/shared/secret-manager');
const secretManager = getSecretManager();

const validation = await secretManager.validateSecrets([
  'GEMINI_API_KEY',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
]);

console.log('Missing secrets:', validation.missing);
```

## 📚 Related Documentation

- [VAULT_SECRET_MANAGEMENT.md](./VAULT_SECRET_MANAGEMENT.md) - Complete Vault setup guide
- [VAULT_QUICK_START.md](./VAULT_QUICK_START.md) - Quick setup instructions
- [.env.example](./.env.example) - Environment variable template

