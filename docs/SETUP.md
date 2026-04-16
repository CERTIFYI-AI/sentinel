# Sentinel Setup Guide

## Prerequisites
- Node.js 18+
- Supabase project (free tier works)

## Steps
1. Clone: `git clone https://github.com/CERTIFYI-AI/sentinel.git`
2. Create Supabase project at supabase.com
3. Run migrations in order: 001 -> 006 in SQL Editor
4. Copy `.env.example` -> `.env.local`
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
6. `cd dashboard && npm install && npm run dev`

## Environment Variables
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Without Supabase
The app works fully with mock data when env vars are not set.
All services gracefully fall back to local mock data.
