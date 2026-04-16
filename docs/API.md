# Sentinel API Reference

## Pattern
Every module follows the same API pattern:

```typescript
const moduleApi = {
  list(filters?)    // GET all with optional filters
  getById(id)       // GET single by UUID
  create(data)      // POST new record + audit log
  update(id, data)  // PATCH record + audit log
  delete(id, name?) // DELETE record + audit log
}
```

## Data Flow
1. React component calls hook (e.g., `useModels()`)
2. Hook calls API function (e.g., `modelsApi.list()`)
3. API uses `fromDB()` to query Supabase with mock fallback
4. Mutations use `mutateDB()` + `logAction()` for audit trail
5. Event bus triggers autonomous agents on key actions

## Realtime Subscriptions
- `notifications` - New alerts pushed to all users
- `guardrail_events` - Real-time guardrail violations
- `live_traces` - Live AI agent activity traces
- `hitl_reviews` - New HITL review requests
