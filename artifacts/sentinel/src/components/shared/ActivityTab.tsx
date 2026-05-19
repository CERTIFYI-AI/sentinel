import React from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { User, Clock, FileText, ArrowRight } from 'lucide-react';

interface Props {
  entityType: string;
  entityId?: string;
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  approved: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  rejected: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  commented: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function ActivityTab({ entityType, entityId }: Props) {
  const { entries, loading } = useAuditLog(entityType, entityId);

  if (!entityId) return null;
  if (loading) return <div className="flex items-center justify-center py-8 text-muted-foreground">Loading activity...</div>;
  if (!entries.length) return <div className="flex items-center justify-center py-8 text-muted-foreground">No activity recorded yet.</div>;

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="relative pl-10">
              <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
              <div className="flex items-start gap-2 flex-wrap">
                <Badge variant="secondary" className={ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-800'}>
                  {entry.action}
                </Badge>
                <span className="text-sm font-medium">{entry.actor || 'System'}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </span>
              </div>
              {entry.detail && <p className="mt-1 text-sm text-muted-foreground">{entry.detail}</p>}
              {entry.diff && (
                <div className="mt-1 text-xs bg-muted rounded p-2 font-mono">
                  {Object.entries(entry.diff).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center gap-1">
                      <span className="font-semibold">{k}:</span>
                      <span className="text-red-500 line-through">{v.old ?? '(empty)'}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-green-500">{v.new ?? '(empty)'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

export default ActivityTab;
