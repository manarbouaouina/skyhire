# SkyHire Shared Utilities

Shared utilities and services for SkyHire backend microservices.

## Installation

```bash
npm install
```

## Components

### Vault Client

HashiCorp Vault client for secure secret management.

```javascript
const { getVaultClient } = require('./vault-client');

const vault = getVaultClient();
const secret = await vault.getSecret('skyhire/gemini', 'api_key', 'GEMINI_API_KEY');
```

### Secret Manager

High-level interface for secret management.

```javascript
const { getSecretManager } = require('./secret-manager');

const secretManager = getSecretManager();
const geminiKey = await secretManager.getGeminiApiKey();
const { clientId, clientSecret } = await secretManager.getGoogleOAuthCredentials();
```

## Usage in Services

Services should import from the shared directory:

```javascript
const { getSecretManager } = require('../../../shared/secret-manager');
```

## Environment Variables

- `VAULT_ADDR` - Vault server address (default: http://localhost:8200)
- `VAULT_TOKEN` - Vault authentication token
- `VAULT_MOUNT_PATH` - Vault mount path (default: secret)
- `ENABLE_VAULT` - Enable Vault (default: false, uses env vars)

## Documentation

See [VAULT_SECRET_MANAGEMENT.md](../../VAULT_SECRET_MANAGEMENT.md) for complete documentation.

