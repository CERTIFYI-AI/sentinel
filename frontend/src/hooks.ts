import { useState, useEffect, useCallback } from 'react';
import { get } from './api';
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => {
    if (!path) return;
    setLoading(true);
    get<T>(path).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}
