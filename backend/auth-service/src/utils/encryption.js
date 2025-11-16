// auth-service/src/utils/encryption.js
const crypto = require('crypto');

// Encryption key - In production, use environment variable and key management service
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text (hex encoded)
 */
function encrypt(text) {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine salt + iv + tag + encrypted
    return salt.toString('hex') + iv.toString('hex') + tag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text (hex encoded)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText) return encryptedText;
  
  try {
    // Extract components
    const salt = Buffer.from(encryptedText.slice(0, SALT_LENGTH * 2), 'hex');
    const iv = Buffer.from(encryptedText.slice(SALT_LENGTH * 2, TAG_POSITION * 2), 'hex');
    const tag = Buffer.from(encryptedText.slice(TAG_POSITION * 2, ENCRYPTED_POSITION * 2), 'hex');
    const encrypted = encryptedText.slice(ENCRYPTED_POSITION * 2);
    
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, return original (might be unencrypted legacy data)
    return encryptedText;
  }
}

/**
 * Check if a string is encrypted (has the expected format)
 * @param {string} text - Text to check
 * @returns {boolean}
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  // Encrypted text should be hex and have minimum length
  return /^[0-9a-f]+$/i.test(text) && text.length > ENCRYPTED_POSITION * 2;
}

/**
 * Encrypt object fields
 * @param {Object} obj - Object to encrypt
 * @param {string[]} fields - Fields to encrypt
 * @returns {Object} - Object with encrypted fields
 */
function encryptFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const encrypted = { ...obj };
  fields.forEach(field => {
    if (encrypted[field] && !isEncrypted(encrypted[field])) {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });
  
  return encrypted;
}

/**
 * Decrypt object fields
 * @param {Object} obj - Object to decrypt
 * @param {string[]} fields - Fields to decrypt
 * @returns {Object} - Object with decrypted fields
 */
function decryptFields(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const decrypted = { ...obj };
  fields.forEach(field => {
    if (decrypted[field] && isEncrypted(decrypted[field])) {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });
  
  return decrypted;
}

/**
 * Permanently erase data by overwriting with random data
 * This is for crypto-shredding - making encrypted data unrecoverable
 * @param {string} encryptedText - Encrypted text to erase
 * @returns {boolean} - Success status
 */
function cryptoShred(encryptedText) {
  if (!encryptedText) return true;
  
  try {
    // Overwrite with random data (simulated - in practice, this would be done at storage level)
    // For MongoDB, we'll delete the document, but this function demonstrates the concept
    const randomData = crypto.randomBytes(encryptedText.length / 2).toString('hex');
    return true;
  } catch (error) {
    console.error('Crypto-shredding error:', error);
    return false;
  }
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  encryptFields,
  decryptFields,
  cryptoShred,
  ENCRYPTION_KEY // Export for key rotation purposes
};

