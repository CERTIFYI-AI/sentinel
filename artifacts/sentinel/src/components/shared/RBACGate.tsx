import React from 'react';
import { useRBAC, Action } from '@/hooks/useRBAC';

interface Props {
  action: Action | Action[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RBACGate({ action, children, fallback = null }: Props) {
  const { can, canAny } = useRBAC();
  const allowed = Array.isArray(action) ? canAny(action) : can(action);
  return <>{allowed ? children : fallback}</>;
}

export default RBACGate;
