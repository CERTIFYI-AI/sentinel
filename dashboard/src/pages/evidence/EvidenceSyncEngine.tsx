import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowsClockwise, CheckCircle, Clock, Warning, XCircle, Database,
  CloudArrowUp, CloudArrowDown, ArrowRight,
} from '@phosphor-icons/react';
import { EVIDENCE, Evidence, EvidenceStatus, statusColor, formatDate } from '../../data/seed';
import { useSettingsStore } from '../../stores/settingsStore';

const SYNC_TIMELINE = [
  { time: '2026-03-31 00:00', event: 'Scheduled sync started', items: 6, success: 6, status: 'ok' },
  { time: '2026-03-15 00:00', event: 'Manual sync triggered by Maria Santos', items: 4, success: 3, status: 'warn' },
  { time: '2026-03-01 00:00', event: 'Scheduled sync started', items: 6, success: 6, status: 'ok' },
  { time: '2026-02-15 00:00', event: 'Scheduled sync started', items: 5, success: 5, status: 'ok' },
  { time: '2026-02-01 00:00', event: 'Sync failed — network error', items: 6, success: 0, status: 'error' },
];

function syncStatusIcon(status: EvidenceStatus) {
  if (status === 'synced') return <CheckCircle size={14} style={{ color: '#10b981' }} />;
  if (status === 'pending') return <Clock size={14} style={{ color: '#f97316' }} />;
  if (status === 'expired') return <Warning size={14} style={{ color: '#ef4444' }} />;
  return <XCircle size={14} style={{ color: '#ef4444' }} />;
}

function timelineStatusColor(status: string) {
  if (status === 'ok') return '#10b981';
  if (status === 'warn') return '#f97316';
  return '#ef4444';
}

export default function EvidenceSyncEngine() {
  const { orgName } = useSettingsStore();

  const [evidence, setEvidence] = useState<Evidence[]>(EVIDENCE);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingItem, setSyncingItem] = useState<string | null>(null);
  const [confirmSyncAll, setConfirmSyncAll] = useState(false);

  const synced = evidence.filter(e => e.status === 'synced').length;
  const pending = evidence.filter(e => e.status === 'pending').length;
  const expired = evidence.filter(e => e.status === 'expired').length;
  const failed = evidence.filter(e => e.status === 'failed').length;

  function handleSyncAll() {
    setSyncingAll(true);
    setConfirmSyncAll(false);
    setTimeout(() => {
      setEvidence(prev => prev.map(e => ({
        ...e,
        status: 'synced' as EvidenceStatus,
        lastSync: new Date().toISOString().split('T')[0],
      })));
      setSyncingAll(false);
    }, 1500);
  }

  function handleSyncItem(id: string) {
    setSyncingItem(id);
    setTimeout(() => {
      setEvidence(prev => prev.map(e => e.id === id ? {
        ...e, status: 'synced' as EvidenceStatus, lastSync: new Date().toISOString().split('T')[0],
      } : e));
      setSyncingItem(null);
    }, 800);
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--text-1))' }}>Evidence Sync Engine</h1>
          <p className="text-sm mt-1" style={{ color: 'hsl(var(--text-3))' }}>
            {orgName} · Automated evidence synchronization and status tracking
          </p>
        </div>
        <Button size="sm" onClick={() => setConfirmSyncAll(true)} disabled={syncingAll}>
          <ArrowsClockwise size={14} className={`mr-1 ${syncingAll ? 'animate-spin' : ''}`} />
          {syncingAll ? 'Syncing All...' : 'Sync All'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Synced', value: synced, icon: CheckCircle, color: '#10b981' },
          { label: 'Pending', value: pending, icon: Clock, color: '#f97316' },
          { label: 'Expired', value: expired, icon: Warning, color: '#ef4444' },
          { label: 'Failed', value: failed, icon: XCircle, color: '#ef4444' },
        ].map(s => (
          <Card key={s.label} style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{s.label}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: 'hsl(var(--text-1))' }}>{s.value}</p>
              </div>
              <s.icon size={28} style={{ color: s.color }} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evidence sync items */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Evidence Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead style={{ background: 'hsl(var(--bg-muted))' }}>
              <tr>
                {['ID', 'Title', 'Source', 'Framework', 'Status', 'Last Sync', 'Owner', 'Sync'].map(h => (
                  <th key={h} className="text-left p-3 text-xs font-semibold" style={{ color: 'hsl(var(--text-2))' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evidence.map(e => {
                const sc = statusColor(e.status);
                const isSyncing = syncingItem === e.id || syncingAll;
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <td className="p-3 text-xs font-mono" style={{ color: 'hsl(var(--text-3))' }}>{e.id}</td>
                    <td className="p-3 text-sm font-medium" style={{ color: 'hsl(var(--text-1))', maxWidth: 200 }}>
                      <span className="line-clamp-2">{e.title}</span>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.source}</td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-2))' }}>{e.framework}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {syncStatusIcon(e.status)}
                        <Badge style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 0, fontSize: 10 }}>
                          {e.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {formatDate(e.lastSync)}
                    </td>
                    <td className="p-3 text-sm" style={{ color: 'hsl(var(--text-2))' }}>{e.owner}</td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        variant="outline"
                        style={{ borderRadius: 0, padding: '4px 10px', fontSize: 11 }}
                        disabled={isSyncing || e.status === 'synced'}
                        onClick={() => handleSyncItem(e.id)}
                      >
                        <ArrowsClockwise size={12} className={`mr-1 ${syncingItem === e.id ? 'animate-spin' : ''}`} />
                        {syncingItem === e.id ? 'Syncing...' : e.status === 'synced' ? 'Synced' : 'Re-sync'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Sync History Timeline */}
      <Card style={{ background: 'hsl(var(--bg-surface))', border: '1px solid hsl(var(--border))' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold" style={{ color: 'hsl(var(--text-1))' }}>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {SYNC_TIMELINE.map((entry, i) => (
              <div key={i} className="flex items-start gap-4 py-3" style={{ borderBottom: i < SYNC_TIMELINE.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}>
                {/* Timeline dot */}
                <div className="flex flex-col items-center" style={{ minWidth: 20 }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: timelineStatusColor(entry.status) }} />
                  {i < SYNC_TIMELINE.length - 1 && <div className="w-0.5 flex-1 mt-1" style={{ background: 'hsl(var(--border))', minHeight: 20 }} />}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-1))' }}>{entry.event}</p>
                    <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>{entry.time}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: 'hsl(var(--text-3))' }}>
                      {entry.items} items · {entry.success} successful
                    </span>
                    {entry.status === 'error' && (
                      <Badge style={{ background: 'hsl(var(--s-er-bg))', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 0, fontSize: 10 }}>
                        Failed
                      </Badge>
                    )}
                    {entry.status === 'warn' && (
                      <Badge style={{ background: 'hsl(var(--s-wn-bg))', color: '#f97316', border: '1px solid #f9731644', borderRadius: 0, fontSize: 10 }}>
                        Partial
                      </Badge>
                    )}
                    {entry.status === 'ok' && (
                      <Badge style={{ background: 'hsl(var(--s-ok-bg))', color: '#10b981', border: '1px solid #10b98144', borderRadius: 0, fontSize: 10 }}>
                        Success
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Sync All Dialog */}
      <AlertDialog open={confirmSyncAll} onOpenChange={setConfirmSyncAll}>
        <AlertDialogContent style={{ background: 'hsl(var(--bg-surface))', borderRadius: 0 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: 'hsl(var(--text-1))' }}>Sync All Evidence</AlertDialogTitle>
            <AlertDialogDescription>
              This will re-sync all {evidence.length} evidence items from their respective sources.
              This may take a few moments. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel style={{ borderRadius: 0 }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSyncAll} style={{ borderRadius: 0 }}>
              <ArrowsClockwise size={14} className="mr-1" /> Sync All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
