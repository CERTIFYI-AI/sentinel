import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Warning, X } from '@phosphor-icons/react';
import { Button } from './button';
import { Input } from './input';

export interface ContextualAlertProps {
  module: string;
  className?: string;
}

export function ContextualAlert({ module, className = '' }: ContextualAlertProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissReason, setDismissReason] = useState<string>('');
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAlerts() {
      if (!isSupabaseConfigured()) {
        // Fallback mock alert for local preview only
        setAlerts([
          {
            id: 'mock-alert-1',
            message: `[MOCK ALERT] SLA Breach or Critical risk detected in ${module}.`,
            severity: 'CRITICAL',
          }
        ]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('governance_alerts')
          .select('*')
          .eq('module', module)
          .eq('dismissed', false);

        if (!error && data) {
          setAlerts(data);
        }
      } catch (err) {
        console.error('Failed to load governance alerts:', err);
      }
    }

    loadAlerts();

    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('governance_alerts_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'governance_alerts', filter: `module=eq.${module}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new;
            if (!newAlert.dismissed) {
              setAlerts((prev) => [newAlert, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            if (updated.dismissed) {
              setAlerts((prev) => prev.filter((a) => a.id !== updated.id));
            } else {
              setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
            }
          } else if (payload.eventType === 'DELETE') {
            setAlerts((prev) => prev.filter((a) => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [module]);

  const handleDismiss = async (alertId: string) => {
    if (!dismissReason.trim()) return;

    if (!isSupabaseConfigured()) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setDismissingId(null);
      setDismissReason('');
      return;
    }

    try {
      const { error } = await supabase
        .from('governance_alerts')
        .update({
          dismissed: true,
          dismissed_reason: dismissReason,
          dismissed_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    } finally {
      setDismissingId(null);
      setDismissReason('');
    }
  };

  if (alerts.length === 0) return null;

  return (
    <div className={`space-y-2 mb-4 sticky top-0 z-40 ${className}`}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-red-50 border-l-4 border-red-500 text-red-800 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-none shadow-sm border"
        >
          <div className="flex items-start gap-2">
            <Warning size={20} className="text-red-500 flex-shrink-0 mt-0.5" weight="duotone" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Governance Mesh Alert</p>
              <p className="text-xs">{alert.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dismissingId === alert.id ? (
              <div className="flex items-center gap-1.5">
                <Input
                  placeholder="Dismissal reason..."
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  className="h-7 text-xs rounded-none bg-white border-red-300 text-text-primary w-40"
                />
                <Button
                  size="sm"
                  onClick={() => handleDismiss(alert.id)}
                  disabled={!dismissReason.trim()}
                  className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-none px-2"
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDismissingId(null)}
                  className="h-7 text-xs rounded-none border-red-300 text-red-700 hover:bg-red-100"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissingId(alert.id)}
                className="text-red-700 hover:bg-red-100 rounded-none p-1"
              >
                <X size={16} />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ContextualAlert;
