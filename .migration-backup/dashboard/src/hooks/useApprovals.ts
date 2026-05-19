import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ApprovalRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  requested_by: string;
  requested_action: string;
  status: 'pending'|'approved'|'rejected';
  approver?: string;
  reason?: string;
  created_at: string;
}

export function useApprovals(entityType: string, entityId?: string) {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);

  const load = useCallback(async () => {
    if (!entityId) return;
    const { data } = await supabase.from('approvals').select('*').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
    setRequests(data || []);
  }, [entityType, entityId]);

  const request = async (action: string, reason?: string) => {
    await supabase.from('approvals').insert({ entity_type: entityType, entity_id: entityId, requested_action: action, reason, status: 'pending' });
    load();
  };

  const decide = async (id: string, status: 'approved'|'rejected', reason?: string) => {
    await supabase.from('approvals').update({ status, reason }).eq('id', id);
    load();
  };

  return { requests, load, request, decide };
}
