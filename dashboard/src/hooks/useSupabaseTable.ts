// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function useSupabaseTable<T extends { id?: string }>(tableName: string, initialSeed: T[] = []) {
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
          if (isMounted) setData(dbData as T[]);
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
      await supabase.from(tableName).upsert(item).catch(() => {});
    }
  };

  // We return setLocalData as 'setData' to emulate useState exactly for older components
  return { data, setData: setLocalData, items: data, setItems: setLocalData, isLoading, save, remove };
}
