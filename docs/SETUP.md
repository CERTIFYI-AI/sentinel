# Sentinel Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account (free tier works)

## Steps

1. **Clone repo**
   ```bash
   git clone https://github.com/CERTIFYI-AI/sentinel.git
   cd sentinel
   ```

2. **Create Supabase project** at supabase.com

3. **Run migrations** in Supabase SQL Editor (in order):
   - `supabase/migrations/006_core.sql`

4. **Configure environment**
   ```bash
   cp dashboard/.env.example dashboard/.env.local
   # Add your Supabase URL and anon key
   ```

5. **Install and run**
   ```bash
   cd dashboard
   npm install
   npm run dev
   ```

6. **Deploy to Cloudflare**
   ```bash
   npm run build
   npx wrangler deploy
   ```

## Environment Variables
| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Supabase anonymous key |
