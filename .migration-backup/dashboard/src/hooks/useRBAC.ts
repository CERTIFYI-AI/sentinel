import { useAuthStore } from '@/store/authStore';

export type Action = 'create'|'read'|'update'|'delete'|'approve'|'publish'|'export'|'admin';

const ROLE_MATRIX: Record<string, Action[]> = {
  admin: ['create','read','update','delete','approve','publish','export','admin'],
  compliance_officer: ['create','read','update','approve','publish','export'],
  risk_manager: ['create','read','update','approve','export'],
  auditor: ['read','export'],
  contributor: ['create','read','update'],
  viewer: ['read'],
};

export function useRBAC() {
  const user = useAuthStore((s: any) => s.user);
  const role = user?.role || 'viewer';
  const customPerms: Action[] = user?.customPermissions || [];
  const perms = new Set<Action>([...(ROLE_MATRIX[role] || ['read']), ...customPerms]);
  const can = (action: Action) => perms.has(action);
  const canAny = (actions: Action[]) => actions.some(a => perms.has(a));
  return { role, can, canAny, user };
}
