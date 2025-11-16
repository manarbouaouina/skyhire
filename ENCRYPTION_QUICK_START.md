# Encryption & Deletion Quick Start Guide

## Quick Setup

### 1. MongoDB Encryption at Rest (MongoDB Enterprise)

```bash
# Generate encryption key
openssl rand -base64 96 > /etc/mongodb/encryption-keyfile
chmod 600 /etc/mongodb/encryption-keyfile
chown mongodb:mongodb /etc/mongodb/encryption-keyfile

# Start MongoDB with encryption
mongod --enableEncryption \
       --encryptionKeyFile /etc/mongodb/encryption-keyfile \
       --dbpath /var/lib/mongodb
```

### 2. Application-Level Encryption

The encryption service is already configured. Keys are stored in:
- **Location**: `backend/auth-service/keys/`
- **Default Key**: `default.key`
- **Permissions**: 600 (owner read/write only)

### 3. Test Encryption

```bash
cd backend/auth-service
node scripts/test-encryption.js
```

### 4. Test Account Deletion

```bash
# 1. Get auth token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.token')

# 2. Delete account
curl -X DELETE http://localhost:5000/api/auth/account \
  -H "Authorization: Bearer $TOKEN"
```

## Key Management

### Generate New Key

```javascript
const { keyManager } = require('./services/encryption');
const { keyId } = keyManager.generateKey('my-new-key');
```

### Rotate Key

```javascript
const rotation = keyManager.rotateKey('new-key-2024');
// Re-encrypt all data with new key
// Then delete old key
```

### Delete Key (Crypto-Shredding)

```javascript
keyManager.deleteKey('old-key-2023');
// All data encrypted with this key is now unrecoverable
```

## Account Deletion

**Endpoint**: `DELETE /api/auth/account`

**What Gets Deleted**:
1. User profile
2. All CVs and files
3. Job applications
4. Chat messages
5. Interview records
6. Notifications
7. Encryption keys (crypto-shredding)
8. User account

**Response**: JSON with deletion status for each service

## Environment Variables

```env
# Encryption
ENCRYPTION_KEY_DIR=/secure/path/to/keys
ENCRYPTION_KEY_ID=default

# MongoDB (Enterprise)
MONGODB_ENCRYPTION_KEYFILE=/etc/mongodb/encryption-keyfile
```

## Security Checklist

- [ ] MongoDB encryption at rest enabled
- [ ] Encryption keys stored securely
- [ ] Key file permissions set to 600
- [ ] Key directory permissions set to 700
- [ ] Regular key rotation scheduled
- [ ] Key backups encrypted and stored off-site
- [ ] Account deletion tested and working
- [ ] Crypto-shredding tested and working

## Documentation

- Full documentation: `MONGODB_ENCRYPTION_AND_DELETION.md`
- Encryption service: `backend/auth-service/src/services/encryption.js`
- Deletion service: `backend/auth-service/src/services/dataDeletion.js`

