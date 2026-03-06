import React from 'react';
import type { ControlStatus } from '../../lib/compliance-types';

const STATUS_STYLES: Record<ControlStatus, string> = {
  pass: 'bg-green-100 text-green-800',
  fail: 'bg-red-100 text-red-800',
  na: 'bg-gray-100 text-gray-600',
  partial: 'bg-yellow-100 text-yellow-800',
};

interface Props {
  status: ControlStatus;
}

export function ControlStatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
