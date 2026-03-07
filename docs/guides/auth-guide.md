# Authentication Guide

## How authentication works

Sentinel uses JWT-based authentication. Every request to a protected endpoint must include:

```
Authorization: Bearer <token>
```

Tokens are short-lived (24 hours). Obtain one via `POST /api/auth/token`.

## API Keys vs. Email/Password

**API keys** (`sk-sentinel-*`) are the recommended method for:
- CI/CD pipelines
- Server-to-server integration
- The LLM proxy (`POST /v1/chat/completions`)
- Automated scripts

**Email/Password** is for team members who use the dashboard interactively.

## Creating an API Key

1. Sign in to the dashboard
2. Navigate to Settings > API Keys
3. Click **Create New Key**
4. Name it (e.g. "Production API Key")
5. Select a role: `api` / `reviewer` / `admin`
6. Set an expiry (or "Never" for long-lived infrastructure keys)
7. Click **Create Key**
8. **Copy the full key immediately.** It will not be shown again.

## Using an API Key

```bash
# Exchange for a JWT
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"api_key": "sk-sentinel-AbCdEfGh..."}' | jq -r .access_token)

# Use the JWT on every request
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

For production use, implement token refresh logic: request a new token when the current one is within 1 hour of expiry.

## Revoking a Key

Settings > API Keys > find the key > click **Revoke**. Revocation is immediate.

## Security recommendations

- Rotate API keys on a schedule (90-day maximum recommended)
- Use different keys for different environments (dev, staging, prod)
- Assign the minimum required role (`api` for proxy-only access)
- Enable the HITL queue depth notification
- Audit key usage via Settings > API Keys (last used timestamp)
