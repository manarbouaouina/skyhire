"""
Secret Manager - High-level interface for secret management (Python)
Uses Vault with fallback to environment variables
"""
import os
import logging
from typing import Optional, Dict, Any, List
from .vault_client import get_vault_client

logger = logging.getLogger(__name__)


class SecretManager:
    """High-level secret management interface"""
    
    def __init__(self):
        self.vault = get_vault_client()
    
    async def get_gemini_api_key(self) -> Optional[str]:
        """Get Gemini API key"""
        return await self.vault.get_secret(
            'skyhire/gemini',
            'api_key',
            'GEMINI_API_KEY'
        )
    
    async def get_eleven_labs_api_key(self) -> Optional[str]:
        """Get Eleven Labs API key"""
        return await self.vault.get_secret(
            'skyhire/elevenlabs',
            'api_key',
            'ELEVEN_LABS_API_KEY'
        )
    
    async def get_jwt_secret(self) -> Optional[str]:
        """Get JWT secret"""
        return await self.vault.get_secret(
            'skyhire/auth',
            'jwt_secret',
            'JWT_SECRET'
        )
    
    async def get_google_oauth_credentials(self) -> Dict[str, Optional[str]]:
        """Get Google OAuth credentials"""
        client_id = await self.vault.get_secret(
            'skyhire/auth',
            'google_client_id',
            'GOOGLE_CLIENT_ID'
        )
        client_secret = await self.vault.get_secret(
            'skyhire/auth',
            'google_client_secret',
            'GOOGLE_CLIENT_SECRET'
        )
        return {
            'client_id': client_id,
            'client_secret': client_secret
        }
    
    async def get_mongodb_uri(self, service_name: str) -> Optional[str]:
        """Get MongoDB connection string"""
        env_var = f"MONGODB_URI_{service_name.upper()}"
        return (
            await self.vault.get_secret(
                f'skyhire/database/{service_name}',
                'connection_string',
                env_var
            ) or os.getenv('MONGODB_URI')
        )
    
    async def validate_secrets(self, required_secrets: List[str]) -> Dict[str, Any]:
        """
        Validate that required secrets are available
        
        Args:
            required_secrets: List of required secret names
        
        Returns:
            Dictionary with 'valid' (bool) and 'missing' (list) keys
        """
        missing = []
        
        for secret_name in required_secrets:
            value = None
            
            if secret_name == 'GEMINI_API_KEY':
                value = await self.get_gemini_api_key()
            elif secret_name == 'ELEVEN_LABS_API_KEY':
                value = await self.get_eleven_labs_api_key()
            elif secret_name == 'JWT_SECRET':
                value = await self.get_jwt_secret()
            elif secret_name == 'GOOGLE_CLIENT_ID':
                credentials = await self.get_google_oauth_credentials()
                value = credentials.get('client_id')
            elif secret_name == 'GOOGLE_CLIENT_SECRET':
                credentials = await self.get_google_oauth_credentials()
                value = credentials.get('client_secret')
            else:
                value = os.getenv(secret_name)
            
            if not value:
                missing.append(secret_name)
        
        return {
            'valid': len(missing) == 0,
            'missing': missing
        }


# Singleton instance
_secret_manager_instance: Optional[SecretManager] = None


def get_secret_manager() -> SecretManager:
    """Get the secret manager instance"""
    global _secret_manager_instance
    if _secret_manager_instance is None:
        _secret_manager_instance = SecretManager()
    return _secret_manager_instance

