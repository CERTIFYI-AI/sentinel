// @ts-nocheck
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const REALTIME_TABLES = [
  { table: 'notifications', queryKey: ['notifications'] },
  { table: 'guardrails', queryKey: ['guardrails'] },
  { table: 'hitl_queue', queryKey: ['hitl-queue'] },
  { table: 'risks', queryKey: ['risks'] },
  { table: 'models', queryKey: ['models'] },
  { table: 'incidents', queryKey: ['incidents'] },
  { table: 'controls', queryKey: ['controls'] },
  { table: 'bias_audits', queryKey: ['bias-audits'] },
  { table: 'audit_log', queryKey: ['audit-log'] },
] as const;

export function useRealtimeInvalidation(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channels: RealtimeChannel[] = [];
    for (const { table, queryKey } of REALTIME_TABLES) {
      try {
        const channel = supabase
          .channel(`realtime-${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            queryClient.invalidateQueries({ queryKey });
          })
          .subscribe();
        channels.push(channel);
      } catch (e) {
        console.warn(`Realtime subscription failed for ${table}:`, e);
      }
    }
    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [queryClient]);
}
