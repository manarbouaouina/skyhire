// Test script for encryption and crypto-shredding
// Run with: node scripts/test-encryption.js

const { keyManager } = require('../src/services/encryption');

async function testEncryption() {
  console.log('=== Encryption and Crypto-Shredding Test ===\n');

  try {
    // 1. Generate a test key
    console.log('1. Generating test encryption key...');
    const { keyId } = keyManager.generateKey('test-user-123');
    console.log(`   Key ID: ${keyId}\n`);

    // 2. Encrypt test data
    console.log('2. Encrypting sensitive data...');
    const sensitiveData = 'test@example.com';
    const encrypted = keyManager.encrypt(sensitiveData, keyId);
    console.log(`   Original: ${sensitiveData}`);
    console.log(`   Encrypted: ${JSON.stringify(encrypted, null, 2)}\n`);

    // 3. Decrypt data (should work)
    console.log('3. Decrypting data...');
    const decrypted = keyManager.decrypt(encrypted);
    console.log(`   Decrypted: ${decrypted}`);
    console.log(`   Match: ${decrypted === sensitiveData ? '✓' : '✗'}\n`);

    // 4. List all keys
    console.log('4. Listing all encryption keys...');
    const keys = keyManager.listKeys();
    console.log(`   Keys: ${keys.join(', ')}\n`);

    // 5. Perform crypto-shredding (delete key)
    console.log('5. Performing crypto-shredding (deleting key)...');
    const deleted = keyManager.deleteKey(keyId);
    console.log(`   Key deleted: ${deleted ? '✓' : '✗'}\n`);

    // 6. Try to decrypt with deleted key (should fail)
    console.log('6. Attempting to decrypt with deleted key...');
    try {
      keyManager.decrypt(encrypted);
      console.log('   ✗ ERROR: Decryption should have failed!\n');
    } catch (error) {
      console.log(`   ✓ Decryption failed as expected: ${error.message}\n`);
    }

    // 7. Test key rotation
    console.log('7. Testing key rotation...');
    const rotation = keyManager.rotateKey('new-key-2024');
    console.log(`   Rotation log: ${JSON.stringify(rotation, null, 2)}\n`);

    console.log('=== Test Complete ===');
    console.log('\nNote: Test keys have been created in the keys directory.');
    console.log('In production, ensure keys are stored securely (KMS, encrypted storage).');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run test
testEncryption();

