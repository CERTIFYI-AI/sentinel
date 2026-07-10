// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useSupabaseTable<T = any>(tableName: string, initialSeed: T[] = []) {
  const [data, setData] = useState<T[]>(initialSeed);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!supabase) return;
    
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { data: dbData, error } = await supabase.from(tableName).select('*');
        if (error) {
          console.warn(`[useSupabaseTable] Table ${tableName} may not exist or error occurred. Falling back to SEED.`);
          if (isMounted) setData(initialSeed);
          return;
        }
        if (dbData && dbData.length > 0) {
          // Uniform doc-jsonb pattern: rows are { id, doc }, where `doc` holds the
          // full UI-shaped record. Unwrap it so the shape round-trips exactly.
          // Backward compatible: if a row has no `doc` column, use it as-is.
          const rows = (dbData as any[]).map(r =>
            r && typeof r === 'object' && 'doc' in r && r.doc
              ? { ...(r.doc as object), id: r.id }
              : r
          );
          if (isMounted) setData(rows as T[]);
        } else {
          // If table is empty, seed it (optional) or just use local state for now
          if (isMounted) setData(initialSeed);
        }
      } catch (err) {
        if (isMounted) setData(initialSeed);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [tableName, initialSeed]);

  const setLocalData = (value: T[] | ((prev: T[]) => T[])) => {
    setData(value);
  };

  const remove = async (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    if (supabase) {
      await supabase.from(tableName).delete().eq('id', id).catch(() => {});
    }
  };
  
  const save = async (item: T) => {
    setData(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
    
    if (supabase) {
      // Persist as the uniform doc-jsonb row shape: { id, doc: <full record> }.
      const row = { id: (item as any).id, doc: item, updated_at: new Date().toISOString() };
      await supabase.from(tableName).upsert(row).catch(() => {});
    }
  };

  // We return setLocalData as 'setData' to emulate useState exactly for older components
  return { data, setData: setLocalData, items: data, setItems: setLocalData, isLoading, save, remove };
}
