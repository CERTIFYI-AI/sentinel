# API Reference

## Service Layer

All data access goes through typed service functions in `dashboard/src/api/`. Direct Supabase client access from components is not permitted.

### Pattern

Every API module exports an object with CRUD methods. Each method uses `fromDB()` for reads and `mutateDB()` for writes, with mock data fallbacks.

### Core Functions

- `fromDB<T>(query, fallback)`: Executes a Supabase query. Returns fallback if Supabase is unavailable.
- `mutateDB<T>(mutation, fallback)`: Executes a Supabase mutation. Calls fallback() if Supabase is unavailable.
- `logAction(params)`: Writes to `audit_log`. Non-blocking.

## Supabase Edge Functions

| Function | Trigger | Purpose |
|----------|---------|--------|
| generate-report | HTTP POST | Compile and format compliance reports |
| ai-advisor | HTTP POST + SSE | Stream GRC recommendations |
| sla-enforcer | Cron (30min) | Mark overdue HITL and DSR items |
| freshness-checker | Cron (daily) | Update evidence freshness status |
| auto-task-generator | DB webhook | Create tasks from new risks/gaps |

## Authentication

All API requests use Supabase JWT authentication. The anon key permits unauthenticated reads only on explicitly public tables. All writes and reads of org-scoped data require a valid session. Token refresh is handled automatically by the Supabase client.
