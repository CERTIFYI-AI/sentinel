# Getting Started

Everything needed to get a Sentinel instance running locally and to keep it
running while you develop against it.

| Document | What it covers |
|---|---|
| [installation.md](installation.md) | Install the proxy with Docker or a virtualenv, set the two required variables, send a first request, seed the Golden Source |
| [dashboard-setup.md](dashboard-setup.md) | Set up the React dashboard against a Supabase project: migrations, `VITE_` environment variables, dev server, Cloudflare deploy |
| [configuration.md](configuration.md) | Every setting Sentinel accepts, how precedence works, and an example `.env` |
| [data-seeding.md](data-seeding.md) | How initial seed data is populated, and how to apply it locally and in production |
| [troubleshooting.md](troubleshooting.md) | Symptom-first fixes for startup, ML model, request-processing, circuit-breaker, dashboard and deployed-instance problems |
| [seed/ARCHITECTURE.md](seed/ARCHITECTURE.md) | Design of the idempotent demo-tenant seed (the "Acme Industries" dataset) |

## Next

- Walk through a full request end to end: [Quickstart](../guides/quickstart.md)
- Understand what happens inside: [How it works](../architecture/how-it-works.md)
- Go to production: [Deployment guide](../operations/deployment.md)
