# MongoDB Encryption & Right to Erasure Implementation

## Overview

This document describes the implementation of encrypted data storage and the right to erasure (GDPR compliance) for the SkyHire application, including MongoDB encryption at rest and comprehensive account deletion.

## Table of Contents

1. [MongoDB Encryption at Rest](#mongodb-encryption-at-rest)
2. [Client-Side Field Encryption](#client-side-field-encryption)
3. [Right to Erasure Implementation](#right-to-erasure-implementation)
4. [Crypto-Shredding](#crypto-shredding)
5. [Key Management](#key-management)
6. [Testing](#testing)

## MongoDB Encryption at Rest

### Option 1: MongoDB Enterprise Encryption (Recommended for Production)

MongoDB Enterprise Edition provides built-in encryption at rest using WiredTiger encryption.

#### Setup Instructions

1. **Generate Encryption Key File**

```bash
# Generate a 96-byte key file
openssl rand -base64 96 > /etc/mongodb/encryption-keyfile

# Set proper permissions (readable only by mongodb user)
chmod 600 /etc/mongodb/encryption-keyfile
chown mongodb:mongodb /etc/mongodb/encryption-keyfile
```

2. **Configure MongoDB with Encryption**

Edit `/etc/mongod.conf`:

```yaml
storage:
  wiredTiger:
    encryption:
      encryptionKeyFile: /etc/mongodb/encryption-keyfile
      encryptionCipherMode: AES256-CBC
```

Or start MongoDB with command-line options:

```bash
mongod --enableEncryption \
       --encryptionKeyFile /etc/mongodb/encryption-keyfile \
       --encryptionCipherMode AES256-CBC \
       --dbpath /var/lib/mongodb
```

3. **Verify Encryption**

```bash
# Check MongoDB logs for encryption status
grep -i encryption /var/log/mongodb/mongod.log

# Should see: "Encryption at rest is enabled"
```

### Option 2: Filesystem-Level Encryption

For MongoDB Community Edition, use filesystem-level encryption:

#### Linux (LUKS)

```bash
# Create encrypted volume
sudo cryptsetup luksFormat /dev/sdb1
sudo cryptsetup luksOpen /dev/sdb1 mongodb-encrypted

# Create filesystem
sudo mkfs.ext4 /dev/mapper/mongodb-encrypted

# Mount
sudo mount /dev/mapper/mongodb-encrypted /var/lib/mongodb
```

#### Windows (BitLocker)

1. Open Disk Management
2. Right-click the MongoDB data drive
3. Select "Turn on BitLocker"
4. Follow the encryption wizard

### Option 3: Cloud Provider Encryption

Most cloud providers offer encryption at rest:

- **MongoDB Atlas**: Encryption at rest enabled by default
- **AWS DocumentDB**: Encryption at rest with AWS KMS
- **Azure Cosmos DB**: Encryption at rest with Azure Key Vault

## Client-Side Field Encryption

For additional security, sensitive fields can be encrypted at the application level before storage.

### Implementation

The encryption service (`backend/auth-service/src/services/encryption.js`) provides:

- **AES-256-CBC encryption** for sensitive fields
- **Key management** with rotation support
- **Crypto-shredding** capability

### Encrypting Sensitive Fields

```javascript
const { keyManager } = require('./services/encryption');

// Encrypt sensitive data before saving
const encryptedEmail = keyManager.encrypt(user.email);
const encryptedPhone = keyManager.encrypt(user.phone);

// Save encrypted data
await User.create({
  name: user.name,
  email: encryptedEmail, // Encrypted
  phone: encryptedPhone, // Encrypted
  // ... other fields
});

// Decrypt when reading
const user = await User.findById(userId);
const decryptedEmail = keyManager.decrypt(user.email);
const decryptedPhone = keyManager.decrypt(user.phone);
```

### Fields to Encrypt

**High Priority (PII):**
- Email addresses
- Phone numbers
- Physical addresses
- Social security numbers (if collected)
- Passport numbers (if collected)

**Medium Priority:**
- CV file contents
- Profile descriptions
- Job application cover letters

## Right to Erasure Implementation

### Account Deletion Endpoint

**Endpoint**: `DELETE /api/auth/account`

**Authentication**: Required (Bearer token or cookie)

**Process**:

1. Delete user profile from User Service
2. Delete all CVs and files from CV Service
3. Delete job applications from Jobs Service
4. Delete chat messages from Chat Service
5. Delete interview records from Interview Service
6. Delete notifications from Notifications Service
7. Perform crypto-shredding (delete encryption keys)
8. Delete user account from Auth Service

### Deletion Flow

```
User Request → Auth Service
    ↓
1. User Profile Service → Delete profile
2. CV Service → Delete CVs + files
3. Jobs Service → Delete applications
4. Chat Service → Delete messages
5. Interview Service → Delete interviews
6. Notifications Service → Delete notifications
7. Crypto-Shredding → Delete encryption keys
8. Auth Service → Delete user account
    ↓
Response with deletion status
```

### Response Format

**Success (200)**:
```json
{
  "status": "success",
  "message": "Account and all associated data deleted successfully",
  "deletedAt": "2024-01-15T10:30:00.000Z",
  "services": {
    "userProfile": { "status": "deleted" },
    "cv": { "status": "deleted" },
    "jobApplications": { "status": "deleted" },
    "chat": { "status": "deleted" },
    "interview": { "status": "deleted" },
    "notifications": { "status": "deleted" },
    "cryptoShredding": { "status": "keys_deleted" },
    "auth": { "status": "deleted" }
  }
}
```

**Partial Success (207)**:
```json
{
  "status": "partial_success",
  "message": "Account deleted, but some data deletion failed",
  "deletedAt": "2024-01-15T10:30:00.000Z",
  "services": {
    "userProfile": { "status": "deleted" },
    "cv": { "status": "error", "error": "Service unavailable" }
  },
  "errors": ["CV Service: Service unavailable"]
}
```

## Crypto-Shredding

Crypto-shredding is the process of making encrypted data unrecoverable by deleting the encryption keys.

### Implementation

When a user account is deleted:

1. **Identify user-specific encryption keys**
   - Keys are stored in `backend/auth-service/keys/`
   - Format: `user-{userId}.key`

2. **Delete encryption keys**
   - Overwrite key file with random data
   - Delete key file
   - Log deletion for audit trail

3. **Result**
   - Data encrypted with deleted keys becomes unrecoverable
   - Even if data remains in backups, it cannot be decrypted

### Key Rotation and Crypto-Shredding

```javascript
const { keyManager } = require('./services/encryption');

// Rotate to new key
const rotation = keyManager.rotateKey('new-key-2024');

// Re-encrypt all data with new key
// ... (re-encryption process)

// Delete old key (crypto-shredding)
keyManager.deleteKey('old-key-2023');
// All data encrypted with old-key-2023 is now unrecoverable
```

## Key Management

### Key Storage

**Location**: `backend/auth-service/keys/`

**Structure**:
```
keys/
├── default.key          # Default encryption key
├── user-{userId}.key    # User-specific keys (if used)
├── rotation-log.json    # Key rotation history
└── deletion-log.json    # Key deletion history
```

### Key Security

1. **File Permissions**: Keys stored with `600` permissions (owner read/write only)
2. **Directory Permissions**: Key directory with `700` permissions
3. **Environment Variables**: Key directory path configurable via `ENCRYPTION_KEY_DIR`
4. **Backup**: Keys should be backed up securely (encrypted, off-site)

### Key Rotation

**When to Rotate**:
- Annually (recommended)
- After security incident
- When key is compromised
- Before deleting old data

**Process**:
1. Generate new key
2. Re-encrypt all data with new key
3. Update application to use new key
4. Delete old key (crypto-shredding)

### Production Recommendations

1. **Use Key Management Service (KMS)**
   - AWS KMS
   - Azure Key Vault
   - Google Cloud KMS
   - HashiCorp Vault

2. **Separate Keys for Different Data Types**
   - User PII keys
   - CV content keys
   - Payment keys (if applicable)

3. **Key Versioning**
   - Track key versions
   - Support multiple active keys during rotation

4. **Audit Logging**
   - Log all key operations
   - Monitor key access
   - Alert on suspicious activity

## Testing

### Test Account Deletion

```bash
# 1. Create a test account
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test-delete@example.com",
    "password": "test123456"
  }'

# 2. Login to get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-delete@example.com",
    "password": "test123456"
  }' | jq -r '.token')

# 3. Delete account
curl -X DELETE http://localhost:5000/api/auth/account \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# 4. Verify deletion - should return 401
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Test Crypto-Shredding

```javascript
// Test script: test-crypto-shredding.js
const { keyManager } = require('./services/encryption');

// 1. Generate test key
const { keyId } = keyManager.generateKey('test-user-123');

// 2. Encrypt test data
const encrypted = keyManager.encrypt('sensitive-data', keyId);
console.log('Encrypted:', encrypted);

// 3. Decrypt (should work)
const decrypted = keyManager.decrypt(encrypted);
console.log('Decrypted:', decrypted);

// 4. Delete key (crypto-shredding)
keyManager.deleteKey(keyId);

// 5. Try to decrypt (should fail)
try {
  keyManager.decrypt(encrypted);
} catch (error) {
  console.log('Decryption failed (expected):', error.message);
}
```

### Verify MongoDB Encryption

```bash
# Check MongoDB encryption status
mongosh --eval "db.serverStatus().wiredTiger.encryption"

# Should show encryption enabled
```

### Verify Data Deletion

```bash
# Connect to MongoDB
mongosh skyhire-auth

# Check if user exists (should not)
db.users.findOne({ email: "test-delete@example.com" })

# Check other collections
use skyhire-cv
db.cvs.find({ userId: ObjectId("...") })

use skyhire-users
db.userprofiles.find({ userId: ObjectId("...") })
```

## Compliance Checklist

### GDPR Right to Erasure

- [x] Account deletion endpoint implemented
- [x] All user data deleted across services
- [x] File deletion (CVs, avatars)
- [x] Crypto-shredding for encrypted data
- [x] Deletion logging and audit trail
- [x] Error handling for partial failures

### Data Encryption

- [x] MongoDB encryption at rest documentation
- [x] Client-side field encryption implementation
- [x] Key management system
- [x] Key rotation capability
- [x] Crypto-shredding implementation

### Security

- [x] Encryption keys stored securely
- [x] Key file permissions (600)
- [x] Key directory permissions (700)
- [x] Audit logging for key operations
- [x] Secure key deletion

## Files Modified/Created

### New Files
- `backend/auth-service/src/services/encryption.js` - Encryption key management
- `MONGODB_ENCRYPTION_AND_DELETION.md` - This documentation

### Modified Files
- `backend/auth-service/src/services/dataDeletion.js` - Added crypto-shredding

## Production Deployment

### Environment Variables

```env
# Encryption Configuration
ENCRYPTION_KEY_DIR=/secure/path/to/keys
ENCRYPTION_KEY_ID=production-key-2024

# MongoDB Encryption (if using MongoDB Enterprise)
MONGODB_ENCRYPTION_KEYFILE=/etc/mongodb/encryption-keyfile
```

### Security Checklist

1. **Key Storage**
   - [ ] Use KMS (AWS KMS, Azure Key Vault, etc.)
   - [ ] Separate keys for different environments
   - [ ] Regular key rotation schedule
   - [ ] Secure key backup

2. **MongoDB**
   - [ ] Enable encryption at rest
   - [ ] Use encrypted connections (TLS)
   - [ ] Regular security updates
   - [ ] Access control (RBAC)

3. **Application**
   - [ ] Secure key file permissions
   - [ ] Audit logging enabled
   - [ ] Regular security audits
   - [ ] Incident response plan

## Troubleshooting

### Key Not Found Error

**Problem**: `Encryption key not found: {keyId}`

**Solution**: 
- Check key file exists in `ENCRYPTION_KEY_DIR`
- Verify key ID matches
- Check file permissions

### Decryption Failed

**Problem**: `Failed to decrypt data - key may have been rotated`

**Solution**:
- Key may have been deleted (crypto-shredded)
- Check key rotation logs
- Verify key ID in encrypted data

### Partial Deletion Failure

**Problem**: Some services fail during deletion

**Solution**:
- Check service availability
- Review error logs
- Retry failed deletions manually
- Check network connectivity

## References

- [MongoDB Encryption at Rest](https://docs.mongodb.com/manual/core/security-encryption-at-rest/)
- [GDPR Right to Erasure](https://gdpr.eu/right-to-be-forgotten/)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

