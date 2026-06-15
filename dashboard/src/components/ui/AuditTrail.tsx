import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Clock, Info } from '@phosphor-icons/react';

export interface AuditTrailProps {
  entityType: string;
  entityId: string;
  className?: string;
}

export function AuditTrail({ entityType, entityId, className = '' }: AuditTrailProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      if (!isSupabaseConfigured()) {
        setLogs([
          {
            id: 'mock-1',
            occurred_at: new Date().toISOString(),
            action: 'UPDATE',
            actor_id: 'u1',
            metadata: { message: `Updated resource ${entityType}` }
          },
          {
            id: 'mock-2',
            occurred_at: new Date(Date.now() - 3600000).toISOString(),
            action: 'CREATE',
            actor_id: 'u2',
            metadata: { message: `Created resource ${entityType}` }
          }
        ]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('audit_log')
          .select('*')
          .eq('resource_type', entityType)
          .eq('resource_id', entityId)
          .order('occurred_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Failed to fetch audit log:', err);
      } finally {
        setLoading(false);
      }
    }

    if (entityId) {
      fetchLogs();
    }
  }, [entityType, entityId]);

  return (
    <div className={`flex flex-col h-full bg-surface ${className}`}>
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
          <Clock size={16} weight="duotone" />
          Audit Trail History
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-xs text-text-muted animate-pulse">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="text-xs text-text-muted italic">No audit history found for this entity.</div>
        ) : (
          <div className="relative border-l-2 border-border ml-2 pl-4 space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="relative">
                <span className="absolute -left-[25px] top-0 bg-surface border-2 border-border rounded-full p-0.5">
                  <Info size={12} className="text-text-muted" weight="duotone" />
                </span>
                <div className="text-xs font-semibold text-text-primary">
                  {log.action} by <span className="font-mono text-xs">{log.actor_id || 'system'}</span>
                </div>
                <div className="text-[10px] text-text-muted">
                  {new Date(log.occurred_at || log.created_at).toLocaleString()}
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <pre className="mt-1 text-[10px] font-mono bg-bg-sunken p-1.5 overflow-x-auto rounded-none border border-border">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditTrail;
