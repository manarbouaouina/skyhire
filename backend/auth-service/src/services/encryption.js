// auth-service/src/services/encryption.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Encryption key management
class EncryptionKeyManager {
  constructor() {
    this.keyDirectory = process.env.ENCRYPTION_KEY_DIR || path.join(__dirname, '../../keys');
    this.currentKeyId = process.env.ENCRYPTION_KEY_ID || 'default';
    this.ensureKeyDirectory();
  }

  ensureKeyDirectory() {
    if (!fs.existsSync(this.keyDirectory)) {
      fs.mkdirSync(this.keyDirectory, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Generate a new encryption key
   * @param {string} keyId - Unique identifier for the key
   * @returns {Buffer} - Generated encryption key
   */
  generateKey(keyId = null) {
    const id = keyId || `key-${Date.now()}`;
    const key = crypto.randomBytes(32); // 256-bit key for AES-256
    
    const keyPath = path.join(this.keyDirectory, `${id}.key`);
    fs.writeFileSync(keyPath, key.toString('hex'), { mode: 0o600 });
    
    console.log(`Generated encryption key: ${id}`);
    return { keyId: id, key, keyPath };
  }

  /**
   * Load an encryption key
   * @param {string} keyId - Key identifier
   * @returns {Buffer} - Encryption key
   */
  loadKey(keyId = null) {
    const id = keyId || this.currentKeyId;
    const keyPath = path.join(this.keyDirectory, `${id}.key`);
    
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Encryption key not found: ${id}`);
    }
    
    const keyHex = fs.readFileSync(keyPath, 'utf8');
    return Buffer.from(keyHex, 'hex');
  }

  /**
   * Encrypt sensitive data
   * @param {string} plaintext - Data to encrypt
   * @param {string} keyId - Key identifier (optional)
   * @returns {Object} - Encrypted data with metadata
   */
  encrypt(plaintext, keyId = null) {
    if (!plaintext) return null;
    
    const key = this.loadKey(keyId);
    const iv = crypto.randomBytes(16); // Initialization vector
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      keyId: keyId || this.currentKeyId,
      algorithm: 'aes-256-cbc'
    };
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    try {
      const key = this.loadKey(encryptedData.keyId);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data - key may have been rotated');
    }
  }

  /**
   * Rotate encryption key (crypto-shredding preparation)
   * @param {string} newKeyId - New key identifier
   * @returns {Object} - Key rotation metadata
   */
  rotateKey(newKeyId = null) {
    const oldKeyId = this.currentKeyId;
    const newId = newKeyId || `key-${Date.now()}`;
    
    // Generate new key
    const { key } = this.generateKey(newId);
    
    // Update current key ID
    this.currentKeyId = newId;
    
    // Log rotation
    const rotationLog = {
      oldKeyId,
      newKeyId: newId,
      rotatedAt: new Date().toISOString(),
      note: 'Old key should be securely deleted after data re-encryption'
    };
    
    const logPath = path.join(this.keyDirectory, 'rotation-log.json');
    let rotations = [];
    if (fs.existsSync(logPath)) {
      rotations = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
    rotations.push(rotationLog);
    fs.writeFileSync(logPath, JSON.stringify(rotations, null, 2));
    
    console.log('Key rotated:', rotationLog);
    return rotationLog;
  }

  /**
   * Delete encryption key (crypto-shredding)
   * @param {string} keyId - Key identifier to delete
   * @returns {boolean} - Success status
   */
  deleteKey(keyId) {
    const keyPath = path.join(this.keyDirectory, `${keyId}.key`);
    
    if (!fs.existsSync(keyPath)) {
      console.warn(`Key not found for deletion: ${keyId}`);
      return false;
    }
    
    // Securely delete key file
    try {
      // Overwrite with random data before deletion (if supported)
      const randomData = crypto.randomBytes(32);
      fs.writeFileSync(keyPath, randomData);
      fs.unlinkSync(keyPath);
      
      console.log(`Key deleted (crypto-shredded): ${keyId}`);
      
      // Log deletion
      const deletionLog = {
        keyId,
        deletedAt: new Date().toISOString(),
        note: 'Key deleted - data encrypted with this key is now unrecoverable'
      };
      
      const logPath = path.join(this.keyDirectory, 'deletion-log.json');
      let deletions = [];
      if (fs.existsSync(logPath)) {
        deletions = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
      deletions.push(deletionLog);
      fs.writeFileSync(logPath, JSON.stringify(deletions, null, 2));
      
      return true;
    } catch (error) {
      console.error(`Failed to delete key ${keyId}:`, error);
      return false;
    }
  }

  /**
   * List all encryption keys
   * @returns {Array} - List of key IDs
   */
  listKeys() {
    if (!fs.existsSync(this.keyDirectory)) {
      return [];
    }
    
    const files = fs.readdirSync(this.keyDirectory);
    return files
      .filter(file => file.endsWith('.key'))
      .map(file => file.replace('.key', ''));
  }
}

// Singleton instance
const keyManager = new EncryptionKeyManager();

module.exports = {
  keyManager,
  EncryptionKeyManager
};

