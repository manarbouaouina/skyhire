// Test script for account deletion
// Run with: node scripts/test-deletion.js <userId> <authToken>

const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const userId = process.argv[2];
const authToken = process.argv[3];

if (!userId || !authToken) {
  console.error('Usage: node test-deletion.js <userId> <authToken>');
  console.error('Example: node test-deletion.js 507f1f77bcf86cd799439011 Bearer_token_here');
  process.exit(1);
}

async function testDeletion() {
  console.log('=== Account Deletion Test ===\n');
  console.log(`User ID: ${userId}`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}\n`);

  try {
    // Test account deletion
    console.log('1. Requesting account deletion...');
    const response = await axios.delete(
      `${AUTH_SERVICE_URL}/api/auth/account`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    console.log('2. Deletion Response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Verify deletion
    console.log('\n3. Verifying deletion...');
    try {
      await axios.get(
        `${AUTH_SERVICE_URL}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('   ✗ ERROR: Profile still accessible!');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('   ✓ Profile no longer accessible (deletion successful)');
      } else {
        console.log(`   ? Unexpected error: ${error.message}`);
      }
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    if (error.response) {
      console.error('Deletion failed:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    process.exit(1);
  }
}

testDeletion();

