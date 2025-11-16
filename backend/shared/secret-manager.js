/**
 * Secret Manager - High-level interface for secret management
 * Uses Vault with fallback to environment variables
 */
const { getVaultClient } = require('./vault-client');

class SecretManager {
  constructor() {
    this.vault = getVaultClient();
    this.secrets = new Map();
  }

  /**
   * Get Gemini API key
   * @returns {Promise<string>} API key
   */
  async getGeminiApiKey() {
    return await this.vault.getSecret(
      'skyhire/gemini',
      'api_key',
      'GEMINI_API_KEY'
    );
  }

  /**
   * Get Eleven Labs API key
   * @returns {Promise<string>} API key
   */
  async getElevenLabsApiKey() {
    return await this.vault.getSecret(
      'skyhire/elevenlabs',
      'api_key',
      'ELEVEN_LABS_API_KEY'
    );
  }

  /**
   * Get JWT secret
   * @returns {Promise<string>} JWT secret
   */
  async getJwtSecret() {
    return await this.vault.getSecret(
      'skyhire/auth',
      'jwt_secret',
      'JWT_SECRET'
    );
  }

  /**
   * Get Google OAuth credentials
   * @returns {Promise<{clientId: string, clientSecret: string}>} OAuth credentials
   */
  async getGoogleOAuthCredentials() {
    const [clientId, clientSecret] = await Promise.all([
      this.vault.getSecret('skyhire/auth', 'google_client_id', 'GOOGLE_CLIENT_ID'),
      this.vault.getSecret('skyhire/auth', 'google_client_secret', 'GOOGLE_CLIENT_SECRET')
    ]);
    return { clientId, clientSecret };
  }

  /**
   * Get MongoDB connection string
   * @param {string} serviceName - Service name (e.g., 'auth', 'users')
   * @returns {Promise<string>} MongoDB URI
   */
  async getMongoDbUri(serviceName) {
    const envVar = `MONGODB_URI_${serviceName.toUpperCase()}`;
    return await this.vault.getSecret(
      `skyhire/database/${serviceName}`,
      'connection_string',
      envVar
    ) || process.env.MONGODB_URI;
  }

  /**
   * Get all required secrets for a service
   * @param {string} serviceName - Service name
   * @returns {Promise<Object>} All secrets for the service
   */
  async getServiceSecrets(serviceName) {
    const secrets = {
      jwtSecret: await this.getJwtSecret(),
      mongoDbUri: await this.getMongoDbUri(serviceName)
    };

    // Add service-specific secrets
    if (serviceName === 'auth') {
      const googleOAuth = await this.getGoogleOAuthCredentials();
      secrets.googleClientId = googleOAuth.clientId;
      secrets.googleClientSecret = googleOAuth.clientSecret;
    }

    return secrets;
  }

  /**
   * Validate that required secrets are available
   * @param {Array<string>} requiredSecrets - List of required secret names
   * @returns {Promise<{valid: boolean, missing: Array<string>}>} Validation result
   */
  async validateSecrets(requiredSecrets) {
    const missing = [];
    
    for (const secretName of requiredSecrets) {
      let value = null;
      
      switch (secretName) {
        case 'GEMINI_API_KEY':
          value = await this.getGeminiApiKey();
          break;
        case 'ELEVEN_LABS_API_KEY':
          value = await this.getElevenLabsApiKey();
          break;
        case 'JWT_SECRET':
          value = await this.getJwtSecret();
          break;
        case 'GOOGLE_CLIENT_ID':
          const googleOAuth = await this.getGoogleOAuthCredentials();
          value = googleOAuth.clientId;
          break;
        case 'GOOGLE_CLIENT_SECRET':
          const googleOAuth2 = await this.getGoogleOAuthCredentials();
          value = googleOAuth2.clientSecret;
          break;
        default:
          value = process.env[secretName];
      }
      
      if (!value) {
        missing.push(secretName);
      }
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }
}

// Singleton instance
let secretManagerInstance = null;

/**
 * Get the secret manager instance
 * @returns {SecretManager} Secret manager instance
 */
function getSecretManager() {
  if (!secretManagerInstance) {
    secretManagerInstance = new SecretManager();
  }
  return secretManagerInstance;
}

module.exports = {
  SecretManager,
  getSecretManager
};

