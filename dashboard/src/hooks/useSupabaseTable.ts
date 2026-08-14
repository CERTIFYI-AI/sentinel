import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * useSupabaseTable — seed-backed CRUD hook over a uniform `doc jsonb` table.
 *
 * Table shape: (id text primary key, doc jsonb, updated_at timestamptz).
 * `doc` holds the full UI-shaped record; the hook unwraps/wraps it so the
 * exact shape round-trips. Persistence is automatic:
 *   - On first load of an EMPTY table, the seed is written so the demo data
 *     is coherent (additions append instead of replacing the seed).
 *   - setData / setItems diff against the previous collection and persist the
 *     delta (upsert changed/added rows, delete removed rows). This makes every
 *     page's existing setItems-based add/edit/delete persist with no per-page
 *     changes required.
 *   - save() / remove() remain for pages that call them granularly.
 * When Supabase isn't configured (local demo mode) it degrades to local state.
 */
export function useSupabaseTable<T = any>(tableName: string, initialSeed: T[] = []) {
  const [data, setData] = useState<T[]>(initialSeed);
  const [isLoading, setIsLoading] = useState(false);
  // Mirror of current data so setLocalData can diff without stale closures.
  const dataRef = useRef<T[]>(initialSeed);
  useEffect(() => { dataRef.current = data; }, [data]);

  const toRow = (item: any) => ({ id: item.id, doc: item, updated_at: new Date().toISOString() });

  useEffect(() => {
    if (!supabase) return;
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: dbData, error } = await supabase.from(tableName).select('*');
        if (error) {
          console.warn(`[useSupabaseTable] Table ${tableName} may not exist. Falling back to SEED.`);
          if (isMounted) { setData(initialSeed); dataRef.current = initialSeed; }
          return;
        }
        if (dbData && dbData.length > 0) {
          // Unwrap the doc-jsonb shape; backward compatible with flat rows.
          const rows = (dbData as any[]).map(r =>
            r && typeof r === 'object' && 'doc' in r && r.doc ? { ...(r.doc as object), id: r.id } : r
          );
          if (isMounted) { setData(rows as T[]); dataRef.current = rows as T[]; }
        } else {
          // Empty table: seed it so CRUD is coherent (best-effort, id-guarded).
          const seedRows = (initialSeed as any[]).filter(i => i && i.id != null).map(toRow);
          if (seedRows.length) { supabase.from(tableName).upsert(seedRows).then(() => {}, () => {}); }
          if (isMounted) { setData(initialSeed); dataRef.current = initialSeed; }
        }
      } catch {
        if (isMounted) { setData(initialSeed); dataRef.current = initialSeed; }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [tableName, initialSeed]);

  // Persist the delta between two collections (by id).
  const persistDelta = (prev: T[], next: T[]) => {
    if (!supabase) return;
    const prevById = new Map((prev as any[]).map(i => [i?.id, i]));
    const nextById = new Map((next as any[]).map(i => [i?.id, i]));
    for (const [id, item] of nextById) {
      if (id == null) continue;
      const old = prevById.get(id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
        supabase.from(tableName).upsert(toRow(item)).then(() => {}, () => {});
      }
    }
    for (const id of prevById.keys()) {
      if (id != null && !nextById.has(id)) {
        supabase.from(tableName).delete().eq('id', id).then(() => {}, () => {});
      }
    }
  };

  // Persisting replacement for useState's setter — diffs prev→next and syncs.
  const setLocalData = (value: T[] | ((prev: T[]) => T[])) => {
    const prev = dataRef.current;
    const next = (typeof value === 'function' ? (value as any)(prev) : value) as T[];
    dataRef.current = next;
    setData(next);
    persistDelta(prev, next);
  };

  const remove = async (id: string) => {
    setLocalData(prev => (prev as any[]).filter(item => item.id !== id) as T[]);
  };

  const save = async (item: T) => {
    setLocalData(prev => {
      const arr = prev as any[];
      const idx = arr.findIndex(i => i.id === (item as any).id);
      if (idx >= 0) { const next = [...arr]; next[idx] = item; return next as T[]; }
      return [...arr, item] as T[];
    });
  };

  return { data, setData: setLocalData, items: data, setItems: setLocalData, isLoading, save, remove };
}
