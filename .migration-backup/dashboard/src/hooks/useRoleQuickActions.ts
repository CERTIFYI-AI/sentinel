// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-04 — Returns quick actions filtered + sorted by current user role.
import { useRBAC } from '../store/rbacStore'

interface QuickAction {
  label: string
  desc: string
  to: string
  icon?: string
  roles?: string[]  // if empty = available to all
  priority?: Record<string, number>  // role → priority ordering
}

export function useRoleQuickActions(actions: QuickAction[]): QuickAction[] {
  const { currentUser } = useRBAC()
  const effectiveRole = currentUser?.role ?? 'viewer'

  return actions
    .filter(a => !a.roles?.length || a.roles.includes(effectiveRole) || effectiveRole === 'admin')
    .sort((a, b) => {
      const pa = a.priority?.[effectiveRole] ?? 99
      const pb = b.priority?.[effectiveRole] ?? 99
      return pa - pb
    })
}
