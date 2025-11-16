// auth-service/src/services/dataDeletion.js
const User = require('../models/User');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { keyManager } = require('./encryption');

const SERVICE_URLS = {
  USER: process.env.USER_SERVICE_URL || 'http://localhost:5002',
  CV: process.env.CV_SERVICE_URL || 'http://localhost:5003',
  JOBS: process.env.JOBS_SERVICE_URL || 'http://localhost:5005',
  CHAT: process.env.CHAT_SERVICE_URL || 'http://localhost:5006',
  INTERVIEW: process.env.INTERVIEW_SERVICE_URL || 'http://localhost:5004',
  NOTIFICATIONS: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:5007'
};

/**
 * Delete user data from all services
 * @param {string} userId - User ID to delete
 * @param {string} authToken - Authentication token for service calls
 * @returns {Object} - Deletion results
 */
async function deleteUserData(userId, authToken) {
  const results = {
    userId,
    deletedAt: new Date(),
    services: {},
    errors: []
  };

  try {
    // 1. Delete from User Service (Profile)
    try {
      const userServiceResponse = await axios.delete(
        `${SERVICE_URLS.USER}/api/users/profile`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      results.services.userProfile = {
        status: 'deleted',
        response: userServiceResponse.data
      };
    } catch (error) {
      results.services.userProfile = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`User Service: ${error.message}`);
    }

    // 2. Delete from CV Service (CVs and files)
    try {
      const cvServiceResponse = await axios.delete(
        `${SERVICE_URLS.CV}/api/cv/all`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // Longer timeout for file deletion
        }
      );
      results.services.cv = {
        status: 'deleted',
        response: cvServiceResponse.data
      };
    } catch (error) {
      results.services.cv = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`CV Service: ${error.message}`);
    }

    // 3. Delete from Jobs Service (Applications)
    try {
      const jobsServiceResponse = await axios.delete(
        `${SERVICE_URLS.JOBS}/api/jobs/applications/all`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      results.services.jobApplications = {
        status: 'deleted',
        response: jobsServiceResponse.data
      };
    } catch (error) {
      results.services.jobApplications = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`Jobs Service: ${error.message}`);
    }

    // 4. Delete from Chat Service (Messages)
    try {
      const chatServiceResponse = await axios.delete(
        `${SERVICE_URLS.CHAT}/api/chat/all`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      results.services.chat = {
        status: 'deleted',
        response: chatServiceResponse.data
      };
    } catch (error) {
      results.services.chat = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`Chat Service: ${error.message}`);
    }

    // 5. Delete from Interview Service
    try {
      const interviewServiceResponse = await axios.delete(
        `${SERVICE_URLS.INTERVIEW}/api/interview/all`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      results.services.interview = {
        status: 'deleted',
        response: interviewServiceResponse.data
      };
    } catch (error) {
      results.services.interview = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`Interview Service: ${error.message}`);
    }

    // 6. Delete from Notifications Service
    try {
      const notificationsServiceResponse = await axios.delete(
        `${SERVICE_URLS.NOTIFICATIONS}/api/notifications/all`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      results.services.notifications = {
        status: 'deleted',
        response: notificationsServiceResponse.data
      };
    } catch (error) {
      results.services.notifications = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`Notifications Service: ${error.message}`);
    }

    // 7. Perform crypto-shredding (delete encryption keys if user-specific keys exist)
    try {
      // In a production system, you might have per-user encryption keys
      // For now, we log the crypto-shredding operation
      const userKeyId = `user-${userId}`;
      const keyDeleted = keyManager.deleteKey(userKeyId);
      
      results.services.cryptoShredding = {
        status: keyDeleted ? 'keys_deleted' : 'no_user_keys',
        note: 'User-specific encryption keys deleted (crypto-shredding)'
      };
    } catch (error) {
      results.services.cryptoShredding = {
        status: 'error',
        error: error.message
      };
      // Don't fail deletion if crypto-shredding fails
      console.warn('Crypto-shredding warning:', error.message);
    }

    // 8. Finally, delete from Auth Service (User account)
    try {
      // Permanently delete user document
      await User.findByIdAndDelete(userId);
      results.services.auth = {
        status: 'deleted'
      };
    } catch (error) {
      results.services.auth = {
        status: 'error',
        error: error.message
      };
      results.errors.push(`Auth Service: ${error.message}`);
    }

    results.success = results.errors.length === 0;
    return results;

  } catch (error) {
    results.success = false;
    results.errors.push(`General error: ${error.message}`);
    return results;
  }
}

/**
 * Anonymize user data instead of deleting (for legal/compliance reasons)
 * @param {string} userId - User ID to anonymize
 * @returns {Object} - Anonymization results
 */
async function anonymizeUserData(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Anonymize sensitive fields
    user.name = `Deleted User ${userId.slice(-8)}`;
    user.email = `deleted-${userId}@deleted.local`;
    user.password = crypto.randomBytes(32).toString('hex'); // Random password
    user.googleId = null;
    user.avatar = '';
    user.profile = {
      bio: '',
      location: '',
      phone: '',
      languages: [],
      skills: [],
      experience: ''
    };
    user.isActive = false;
    user.deletedAt = new Date();

    await user.save();

    return {
      success: true,
      userId,
      anonymizedAt: new Date()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  deleteUserData,
  anonymizeUserData
};

