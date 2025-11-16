"""
HashiCorp Vault Client for Secret Management (Python)
Provides secure access to secrets with fallback to environment variables
"""
import os
import logging
import time
from typing import Optional, Dict, Any, List
from functools import lru_cache

try:
    import hvac
    HVAC_AVAILABLE = True
except ImportError:
    HVAC_AVAILABLE = False
    logging.warning("hvac library not installed. Install with: pip install hvac")

logger = logging.getLogger(__name__)


class VaultClient:
    """HashiCorp Vault client for secret management"""
    
    def __init__(self, options: Optional[Dict[str, Any]] = None):
        """
        Initialize Vault client
        
        Args:
            options: Configuration options
                - vault_url: Vault server URL
                - vault_token: Vault authentication token
                - mount_path: Secret mount path (default: 'secret')
                - enable_vault: Enable Vault (default: from ENABLE_VAULT env var)
                - cache_ttl: Cache TTL in seconds (default: 300)
        """
        options = options or {}
        self.vault_url = options.get('vault_url') or os.getenv('VAULT_ADDR', 'http://localhost:8200')
        self.vault_token = options.get('vault_token') or os.getenv('VAULT_TOKEN')
        self.mount_path = options.get('mount_path') or os.getenv('VAULT_MOUNT_PATH', 'secret')
        self.enable_vault = (
            options.get('enable_vault') or 
            os.getenv('ENABLE_VAULT', 'false').lower() == 'true'
        )
        self.cache_ttl = options.get('cache_ttl', 300)  # 5 minutes
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.client = None
        
        # Initialize Vault client if enabled
        if self.enable_vault and self.vault_token and HVAC_AVAILABLE:
            try:
                self.client = hvac.Client(url=self.vault_url, token=self.vault_token)
                # Verify connection
                if self.client.is_authenticated():
                    logger.info(f"✅ Vault client initialized: {self.vault_url}")
                else:
                    logger.warning("⚠️ Vault authentication failed")
                    self.enable_vault = False
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Vault client: {e}")
                logger.warning("⚠️ Falling back to environment variables")
                self.enable_vault = False
        else:
            if not HVAC_AVAILABLE:
                logger.info("ℹ️ hvac library not available, using environment variables")
            else:
                logger.info("ℹ️ Vault disabled, using environment variables")
    
    def _get_cache_key(self, secret_path: str, secret_key: str) -> str:
        """Generate cache key"""
        return f"{secret_path}:{secret_key}"
    
    def _is_cache_valid(self, cache_entry: Dict[str, Any]) -> bool:
        """Check if cache entry is still valid"""
        if not cache_entry:
            return False
        age = time.time() - cache_entry.get('timestamp', 0)
        return age < self.cache_ttl
    
    async def get_secret(
        self, 
        secret_path: str, 
        secret_key: str, 
        env_var: Optional[str] = None
    ) -> Optional[str]:
        """
        Get a secret from Vault or environment variable
        
        Args:
            secret_path: Path to secret in Vault (e.g., 'skyhire/data/gemini-api-key')
            secret_key: Key name within the secret
            env_var: Environment variable name as fallback
        
        Returns:
            Secret value or None if not found
        """
        # Check cache first
        cache_key = self._get_cache_key(secret_path, secret_key)
        cached = self.cache.get(cache_key)
        if cached and self._is_cache_valid(cached):
            return cached.get('value')
        
        secret = None
        
        # Try Vault first if enabled
        if self.enable_vault and self.client:
            try:
                # Vault KV v2 path format: secret/data/path
                full_path = f"{self.mount_path}/data/{secret_path}"
                response = self.client.secrets.kv.v2.read_secret_version(path=secret_path)
                
                if response and 'data' in response and 'data' in response['data']:
                    secret = response['data']['data'].get(secret_key)
                    if secret:
                        # Cache the secret
                        self.cache[cache_key] = {
                            'value': secret,
                            'timestamp': time.time()
                        }
                        return secret
            except Exception as e:
                logger.warning(f"⚠️ Failed to read secret from Vault ({secret_path}): {e}")
                # Fall through to environment variable
        
        # Fallback to environment variable
        if env_var and os.getenv(env_var):
            secret = os.getenv(env_var)
            # Cache the env var value
            self.cache[cache_key] = {
                'value': secret,
                'timestamp': time.time()
            }
            return secret
        
        return None
    
    async def get_secrets(
        self, 
        secrets: List[Dict[str, str]]
    ) -> Dict[str, Optional[str]]:
        """
        Get multiple secrets at once
        
        Args:
            secrets: List of dicts with 'path', 'key', and 'env_var' keys
        
        Returns:
            Dictionary with secret values
        """
        result = {}
        for secret_config in secrets:
            key = secret_config.get('key')
            path = secret_config.get('path')
            env_var = secret_config.get('env_var')
            result[key] = await self.get_secret(path, key, env_var)
        return result
    
    def write_secret(self, secret_path: str, data: Dict[str, Any]) -> bool:
        """
        Write a secret to Vault (admin operation)
        
        Args:
            secret_path: Path to secret
            data: Secret data
        
        Returns:
            Success status
        """
        if not self.enable_vault or not self.client:
            raise ValueError("Vault is not enabled or not initialized")
        
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=secret_path,
                secret=data
            )
            # Clear cache for this path
            self.cache.clear()
            return True
        except Exception as e:
            logger.error(f"❌ Failed to write secret to Vault: {e}")
            raise
    
    def health_check(self) -> bool:
        """
        Check if Vault is available and healthy
        
        Returns:
            Health status
        """
        if not self.enable_vault or not self.client:
            return False
        
        try:
            return self.client.is_authenticated() and not self.client.seal_status.get('sealed', True)
        except Exception:
            return False
    
    def clear_cache(self):
        """Clear the secret cache"""
        self.cache.clear()


# Singleton instance
_vault_client_instance: Optional[VaultClient] = None


def get_vault_client(options: Optional[Dict[str, Any]] = None) -> VaultClient:
    """
    Get or create the Vault client instance
    
    Args:
        options: Vault client options
    
    Returns:
        Vault client instance
    """
    global _vault_client_instance
    if _vault_client_instance is None:
        _vault_client_instance = VaultClient(options)
    return _vault_client_instance

