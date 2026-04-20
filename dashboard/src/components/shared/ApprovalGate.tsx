import React, { useEffect, useState } from 'react';
import { useApprovals } from '@/hooks/useApprovals';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Shield, Check, X, Clock } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  entityType: string;
  entityId?: string;
  requiredAction: string;
  onApproved?: () => void;
  children: React.ReactNode;
}

export function ApprovalGate({ entityType, entityId, requiredAction, onApproved, children }: Props) {
  const { requests, load, request, decide } = useApprovals(entityType, entityId);
  const { can } = useRBAC();
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, [load]);

  const pending = requests.find(r => r.requested_action === requiredAction && r.status === 'pending');
  const approved = requests.find(r => r.requested_action === requiredAction && r.status === 'approved');

  if (approved) return <>{children}</>;

  if (pending) {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Pending approval: {requiredAction}</span>
          <Badge variant="secondary">Awaiting</Badge>
        </div>
        {can('approve') && (
          <div className="space-y-2">
            <Textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { decide(pending.id, 'approved', reason); onApproved?.(); }}>
                <Check className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="destructive" onClick={() => decide(pending.id, 'rejected', reason)}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showForm ? (
        <div className="border rounded-lg p-4 space-y-3">
          <p className="text-sm">Request approval for: <strong>{requiredAction}</strong></p>
          <Textarea placeholder="Reason for request" value={reason} onChange={e => setReason(e.target.value)} rows={2} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { request(requiredAction, reason); setShowForm(false); }}>
              <Shield className="h-3 w-3 mr-1" /> Submit Request
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Shield className="h-3 w-3 mr-1" /> Request Approval
        </Button>
      )}
    </div>
  );
}

export default ApprovalGate;
