# Sentinel API Reference

## Data Layer Pattern
Every module follows the same pattern:
1. **Service** (`src/services/{module}Service.ts`): Supabase queries with mock fallback
2. **Hook** (`src/hooks/use{Module}Data.ts`): React Query wrapper with cache invalidation
3. **Audit**: Every mutation calls `logAction()` for compliance trail

## Service API Pattern
```typescript
// Fetch all records (with mock fallback)
export async function fetchModels(): Promise<Model[]>

// Upsert (create or update)
export async function upsertModel(record: Partial<Model>): Promise<Model>

// Delete
export async function deleteModel(id: string): Promise<boolean>
```

## Hook API Pattern
```typescript
// Query hook
export function useModels() {
  return useQuery({ queryKey: ["models"], queryFn: fetchModels })
}

// Mutation hook
export function useUpsertModel() {
  return useMutation({ mutationFn: upsertModel, onSuccess: invalidate })
}
```

## Tables
All tables use UUID primary keys, timestamptz for dates, and jsonb for flexible data.
Generated columns: `risks.risk_score`, `risks.severity`, `risks.residual_score`
