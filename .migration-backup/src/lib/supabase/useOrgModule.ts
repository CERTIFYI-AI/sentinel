import { useEffect, useState, useCallback } from 'react';
import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type OrgModule =
  | 'departments' | 'roles' | 'committees' | 'training_courses'
  | 'bcp_plans' | 'ethics_reports' | 'assets' | 'identities'
  | 'bia_processes' | 'risk_register' | 'ai_models' | 'tasks';

export function useOrgModule<T extends { id: string; org_id: string }>(
  table: OrgModule,
  orgId: string | null,
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase.from(table).select('*').eq('org_id', orgId);
    if (error) setError(error); else setRows((data ?? []) as T[]);
    setLoading(false);
  }, [table, orgId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!orgId) return;
    const ch: RealtimeChannel = supabase
      .channel(`rt:${table}:${orgId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table, filter: `org_id=eq.${orgId}` },
          (p) => {
            setRows((prev) => {
              if (p.eventType === 'INSERT') return [p.new as T, ...prev];
              if (p.eventType === 'UPDATE') return prev.map(r => r.id === (p.new as T).id ? (p.new as T) : r);
              if (p.eventType === 'DELETE') return prev.filter(r => r.id !== (p.old as T).id);
              return prev;
            });
          })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [table, orgId]);

  return { rows, loading, error, refresh };
}
