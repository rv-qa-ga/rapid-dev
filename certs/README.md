# Certificates Directory

This directory contains SSL certificates and private keys for JWT authentication.

## Required Files

### `server.key`
- **Purpose**: Private key file for Salesforce JWT OAuth authentication
- **Format**: PEM format private key
- **Location**: `certs/server.key`
- **Security**: ⚠️ **NEVER COMMIT THIS FILE TO GIT** - It's already in `.gitignore`

## Setup Instructions

1. **Obtain the private key** from your Salesforce Connected App configuration
2. **Save the key** as `server.key` in this directory
3. **Update `.env.qa`** with the correct path:
   ```
   SF_CERT_PATH=certs/server.key
   ```

## Alternative: Use SF_PRIVATE_KEY Environment Variable

Instead of a file, you can provide the private key directly in `.env.qa`:

```
SF_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your key content...\n-----END PRIVATE KEY-----"
```

## Security Notes

- This directory is git-ignored
- Never share private keys
- Rotate keys if compromised
- Use different keys for different environments (dev, qa, uat, prod)

