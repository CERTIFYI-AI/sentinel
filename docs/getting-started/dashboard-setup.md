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

3. **Apply the full migration history** (Supabase CLI):
   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db reset          # or: supabase db push (existing project)
   ```
   This applies everything in `supabase/migrations/` — schema, RLS policies
   and the idempotent, fully fictional demo seeds. Do **not** apply single
   files by hand; ordering matters (see `supabase/migrations/README.md`).

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

## First sign-in

The seeds create demo *data*, not demo *logins* — no credentials ship in this
repo. Create your own user and link it to the demo organisation:

1. Supabase Studio → **Authentication → Users → Add user**.
2. SQL editor:
   ```sql
   insert into user_profiles (id, org_id, full_name, role)
   values ('<auth-user-uuid>', '00000000-0000-0000-0000-000000000001', 'Your Name', 'org_admin');
   ```
3. Sign in at `http://localhost:5000`.

All seeded content is fictional; see the note in the root README.

## Environment Variables
| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | Supabase project URL |
| VITE_SUPABASE_ANON_KEY | Supabase anonymous key |
