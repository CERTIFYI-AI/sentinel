import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  actor: string;
  action: string;
  detail?: string;
  diff?: any;
  created_at: string;
}

export function useAuditLog(entityType: string, entityId?: string) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      setEntries(data || []);
    } finally { setLoading(false); }
  }, [entityType, entityId]);

  useEffect(() => { load(); }, [load]);

  const append = async (action: string, detail?: string, diff?: any) => {
    if (!entityId) return;
    await supabase.from('audit_log').insert({ entity_type: entityType, entity_id: entityId, action, detail, diff });
    load();
  };

  return { entries, loading, append, reload: load };
}
