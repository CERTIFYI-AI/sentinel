# Sentinel AI GRC - Setup Guide

## Prerequisites
- Node.js 20+
- npm 10+
- Supabase account (or local Supabase via Docker)

## Quick Start

```bash
cd dashboard
npm install
cp .env.example .env  # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

## Database Setup

Run migrations in order:
```bash
supabase db push
# Or manually:
psql < supabase/migrations/020_rls.sql
psql < supabase/migrations/021_storage.sql
psql < supabase/migrations/022_seed.sql
```

## Demo Mode
If no Supabase is configured, the app falls back to demo mode with mock data.
Login: `admin@sentinel.demo` (any password)

## Build
```bash
npm run build
npm run typecheck
```
