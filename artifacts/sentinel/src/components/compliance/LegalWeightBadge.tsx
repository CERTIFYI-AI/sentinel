// @ts-nocheck
import React from 'react';
import type { LegalWeight } from '../../lib/compliance-types';

const WEIGHT_STYLES: Record<LegalWeight, string> = {
  regulatory: 'bg-red-100 text-red-800 border border-red-300',
  contractual: 'bg-orange-100 text-orange-800 border border-orange-300',
  'best-practice': 'bg-blue-100 text-blue-800 border border-blue-300',
  informational: 'bg-muted text-foreground border border-border',
};

const WEIGHT_LABELS: Record<LegalWeight, string> = {
  regulatory: 'Regulatory',
  contractual: 'Contractual',
  'best-practice': 'Best Practice',
  informational: 'Informational',
};

interface Props {
  weight: LegalWeight;
}

export function LegalWeightBadge({ weight }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${WEIGHT_STYLES[weight]}`}>
      {WEIGHT_LABELS[weight]}
    </span>
  );
}
