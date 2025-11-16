/**
 * HashiCorp Vault Client for Secret Management
 * Provides secure access to secrets with fallback to environment variables
 */
const vault = require('node-vault');
const https = require('https');

class VaultClient {
  constructor(options = {}) {
    this.vaultUrl = options.vaultUrl || process.env.VAULT_ADDR || 'http://localhost:8200';
    this.vaultToken = options.vaultToken || process.env.VAULT_TOKEN;
    this.mountPath = options.mountPath || process.env.VAULT_MOUNT_PATH || 'secret';
    this.enableVault = process.env.ENABLE_VAULT === 'true' || options.enableVault === true;
    this.client = null;
    this.cache = new Map(); // Cache secrets to reduce Vault calls
    this.cacheTTL = options.cacheTTL || 300000; // 5 minutes default
    
    // Initialize Vault client if enabled
    if (this.enableVault && this.vaultToken) {
      try {
        this.client = vault({
          apiVersion: 'v1',
          endpoint: this.vaultUrl,
          token: this.vaultToken,
          // Allow self-signed certificates in development
          requestOptions: {
            httpsAgent: new https.Agent({
              rejectUnauthorized: process.env.NODE_ENV === 'production'
            })
          }
        });
        console.log(`✅ Vault client initialized: ${this.vaultUrl}`);
      } catch (error) {
        console.warn(`⚠️ Failed to initialize Vault client: ${error.message}`);
        console.warn('⚠️ Falling back to environment variables');
        this.enableVault = false;
      }
    } else {
      console.log('ℹ️ Vault disabled, using environment variables');
    }
  }

  /**
   * Get a secret from Vault or environment variable
   * @param {string} secretPath - Path to secret in Vault (e.g., 'data/skyhire/gemini-api-key')
   * @param {string} secretKey - Key name within the secret
   * @param {string} envVar - Environment variable name as fallback
   * @returns {Promise<string|null>} Secret value or null if not found
   */
  async getSecret(secretPath, secretKey, envVar) {
    // Check cache first
    const cacheKey = `${secretPath}:${secretKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.value;
    }

    let secret = null;

    // Try Vault first if enabled
    if (this.enableVault && this.client) {
      try {
        // For KV v2, use readSecretVersion method
        // Path format: secret/data/path (without the mount path prefix in the method)
        const response = await this.client.readSecretVersion({
          mountPoint: this.mountPath,
          path: secretPath
        });
        
        if (response && response.data && response.data.data) {
          secret = response.data.data[secretKey];
          if (secret) {
            // Cache the secret
            this.cache.set(cacheKey, {
              value: secret,
              timestamp: Date.now()
            });
            return secret;
          }
        }
      } catch (error) {
        // Try alternative read method for KV v1 or different path format
        try {
          const fullPath = `${this.mountPath}/data/${secretPath}`;
          const response = await this.client.read(fullPath);
          if (response && response.data && response.data.data) {
            secret = response.data.data[secretKey];
            if (secret) {
              this.cache.set(cacheKey, {
                value: secret,
                timestamp: Date.now()
              });
              return secret;
            }
          }
        } catch (err) {
          console.warn(`⚠️ Failed to read secret from Vault (${secretPath}): ${error.message}`);
          // Fall through to environment variable
        }
      }
    }

    // Fallback to environment variable
    if (envVar && process.env[envVar]) {
      secret = process.env[envVar];
      // Cache the env var value
      this.cache.set(cacheKey, {
        value: secret,
        timestamp: Date.now()
      });
      return secret;
    }

    return null;
  }

  /**
   * Get multiple secrets at once
   * @param {Array<{path: string, key: string, envVar: string}>} secrets
   * @returns {Promise<Object>} Object with secret values
   */
  async getSecrets(secrets) {
    const result = {};
    await Promise.all(
      secrets.map(async ({ path, key, envVar }) => {
        result[key] = await this.getSecret(path, key, envVar);
      })
    );
    return result;
  }

  /**
   * Write a secret to Vault (admin operation)
   * @param {string} secretPath - Path to secret
   * @param {Object} data - Secret data
   * @returns {Promise<boolean>} Success status
   */
  async writeSecret(secretPath, data) {
    if (!this.enableVault || !this.client) {
      throw new Error('Vault is not enabled or not initialized');
    }

    try {
      // For KV v2, use writeSecret method
      await this.client.writeSecret({
        mountPoint: this.mountPath,
        path: secretPath,
        secret: data
      });
      // Clear cache for this path
      this.cache.clear();
      return true;
    } catch (error) {
      // Try alternative write method
      try {
        const fullPath = `${this.mountPath}/data/${secretPath}`;
        await this.client.write(fullPath, { data });
        this.cache.clear();
        return true;
      } catch (err) {
        console.error(`❌ Failed to write secret to Vault: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * Check if Vault is available and healthy
   * @returns {Promise<boolean>} Health status
   */
  async healthCheck() {
    if (!this.enableVault || !this.client) {
      return false;
    }

    try {
      // node-vault uses health() method
      const response = await this.client.health();
      return response && response.initialized && !response.sealed;
    } catch (error) {
      // If health() fails, try to read a test secret to verify connectivity
      try {
        // Just check if we can authenticate
        await this.client.tokenLookupSelf();
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  /**
   * Clear the secret cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Singleton instance
let vaultClientInstance = null;

/**
 * Get or create the Vault client instance
 * @param {Object} options - Vault client options
 * @returns {VaultClient} Vault client instance
 */
function getVaultClient(options = {}) {
  if (!vaultClientInstance) {
    vaultClientInstance = new VaultClient(options);
  }
  return vaultClientInstance;
}

module.exports = {
  VaultClient,
  getVaultClient
};

