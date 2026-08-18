# Sentinel AI GRC — Deployment Guide

## Canonical Runtime: Cloudflare Workers

The production deployment target is **Cloudflare Workers** via `wrangler`.

```bash
# Install wrangler
npm install -g wrangler

# Deploy
cd dashboard
pnpm build
wrangler deploy
```

### Configuration
- `wrangler.jsonc` — Workers configuration (canonical)
- `public/_headers` — Security headers (CSP, HSTS, etc.)

## Alternative Deployments (Examples)

These are provided as community examples, not officially supported:

| Target | Config | Notes |
|--------|--------|-------|
| Vercel | `vercel.json` | Serverless functions |
| Docker | `Dockerfile`, `docker-compose.yml` | Container deployment |
| Kubernetes | `k8s/` | Orchestration |
| Nginx | `dashboard/nginx.conf` | Reverse proxy (Docker-only) |

## Security Headers

Security headers are configured in `public/_headers` and include:
- CSP (Content-Security-Policy)
- HSTS (63072000s / ~2 years with preload)
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy (camera, mic, geo all disabled)

## Pre-GA Checklist

- [x] Move to custom domain (off workers.dev for cookie isolation) —
      `1shield-oss.certifyi.ai`, declared in `dashboard/wrangler.toml`.
      Requires `certifyi.ai` to be a zone on the same Cloudflare account.
      The workers.dev subdomain keeps serving unless disabled separately.
- [ ] Add Turnstile CAPTCHA on /auth/*
- [ ] Configure WAF rate limiting (5 req/min/IP on auth endpoints)
- [ ] Run `make audit` before every release tag
