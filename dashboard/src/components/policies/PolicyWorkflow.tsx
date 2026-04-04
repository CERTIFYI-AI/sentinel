import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { PolicyStatus } from '@/lib/types/policy';
import { STATUS_COLORS, VALID_TRANSITIONS } from '@/lib/types/policy';

interface Props {
  currentStatus: PolicyStatus;
  onTransition?: (newStatus: PolicyStatus) => void;
  policyName?: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileEdit className='h-4 w-4' />,
  pending_review: <Eye className='h-4 w-4' />,
  pending_approval: <Clock className='h-4 w-4' />,
  approved: <CheckCircle className='h-4 w-4' />,
  published: <Send className='h-4 w-4' />,
  rejected: <XCircle className='h-4 w-4' />,
};

const WORKFLOW_STEPS: PolicyStatus[] = ['draft', 'pending_review', 'pending_approval', 'approved', 'published'];

export function PolicyWorkflow({ currentStatus, onTransition, policyName }: Props) {
  const availableTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const currentIdx = WORKFLOW_STEPS.indexOf(currentStatus);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-lg'>Policy Workflow{policyName ? `: ${policyName}` : ''}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex items-center justify-between mb-6'>
          {WORKFLOW_STEPS.map((step, idx) => (
            <React.Fragment key={step}>
              <div className={`flex flex-col items-center gap-1 ${idx <= currentIdx ? 'text-[#1A6B5A]' : 'text-muted-foreground'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${idx < currentIdx ? 'bg-[#1A6B5A] text-foreground border-primary' : idx === currentIdx ? 'border-primary bg-[#1A6B5A]/10' : 'border-muted'}`}>
                  {STATUS_ICONS[step] || <span className='text-xs'>{idx + 1}</span>}
                </div>
                <span className='text-xs capitalize'>{step.replace('_', ' ')}</span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && <ArrowRight className={`h-4 w-4 ${idx < currentIdx ? 'text-[#1A6B5A]' : 'text-muted'}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>Current:</span>
          <Badge className={STATUS_COLORS[currentStatus]}>{currentStatus.replace('_', ' ')}</Badge>
        </div>
        {availableTransitions.length > 0 && (
          <div className='mt-4 flex gap-2 flex-wrap'>
            {availableTransitions.map(t => (
              <Button key={t} size='sm' variant={t === 'rejected' || t === 'archived' ? 'destructive' : 'default'} onClick={() => onTransition?.(t)}>
                Move to {t.replace('_', ' ')}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
