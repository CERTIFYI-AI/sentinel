# Sentinel AI GRC - Backend Architecture

## Supabase Integration

### Data Layer
- `src/lib/supabaseClient.ts` - Singleton Supabase client
- `src/lib/dataSource.ts` - `fetchDB()` and `mutateDB()` wrappers with graceful mock fallback
- `src/api/*.ts` - Per-module CRUD operations (models, risks, controls, etc.)

### Auth Layer
- `src/lib/auth.ts` - signIn, signUp, signOut, getSession with demo fallback
- `src/stores/authStore.ts` - Zustand store with persist middleware

### RLS (Row Level Security)
- `supabase/migrations/020_rls.sql` - Org-isolation for all 20+ tables
- Helper functions: `get_my_org_id()`, `get_my_role()`
- DELETE restricted to admin/ciso roles
- audit_log is append-only

### Storage
- `supabase/migrations/021_storage.sql` - 3 buckets: evidence, reports, avatars
- `src/lib/storage.ts` - Upload, delete, list, getPublicUrl helpers

### Audit & Evidence Chain
- `src/agents/auditAgent.ts` - SHA-256 hashed audit log entries
- `src/lib/evidenceChain.ts` - Tamper-evident chain with previous hash linking

### Realtime
- `src/hooks/useRealtimeInvalidation.ts` - Auto-invalidates React Query cache on DB changes
- Tables: notifications, guardrails, hitl_queue, risks, models, incidents, controls, bias_audits, audit_log

### CI/CD
- `.github/workflows/ci.yml` - TypeScript check + build + Cloudflare Pages deploy
- Required secrets: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, CF_API_TOKEN, CF_ACCOUNT_ID

## Type System
- `src/types/database.ts` - Auto-generated Supabase types for all 20 tables
- `src/types/index.ts` - Re-exports + utility types
