import { create } from 'zustand';
import { User, RBACRole } from '../types/entities';

type Permission = 'read' | 'write' | 'delete' | 'approve' | 'admin' | 'audit' | 'configure';
type Resource = 'policies' | 'controls' | 'models' | 'datasets' | 'agents' | 'vendors' | 'bias_audits' | 'evidence' | 'hitl' | 'regulations' | 'shadow_ai' | 'trust_engine' | 'settings' | 'users';

const rolePermissions: Record<RBACRole, Record<Resource, Permission[]>> = {
  admin: Object.fromEntries(['policies','controls','models','datasets','agents','vendors','bias_audits','evidence','hitl','regulations','shadow_ai','trust_engine','settings','users'].map(r => [r, ['read','write','delete','approve','admin','audit','configure']])) as any,
  compliance_officer: Object.fromEntries(['policies','controls','models','datasets','agents','vendors','bias_audits','evidence','hitl','regulations','shadow_ai','trust_engine'].map(r => [r, ['read','write','approve','audit']])) as any,
  model_owner: { policies: ['read'], controls: ['read','write'], models: ['read','write'], datasets: ['read','write'], agents: ['read','write'], vendors: ['read'], bias_audits: ['read'], evidence: ['read','write'], hitl: ['read'], regulations: ['read'], shadow_ai: ['read'], trust_engine: ['read','configure'], settings: [], users: [] } as any,
  auditor: Object.fromEntries(['policies','controls','models','datasets','agents','vendors','bias_audits','evidence','hitl','regulations','shadow_ai','trust_engine','settings','users'].map(r => [r, ['read','audit']])) as any,
  viewer: Object.fromEntries(['policies','controls','models','datasets','agents','vendors','bias_audits','evidence','hitl','regulations','shadow_ai','trust_engine'].map(r => [r, ['read']])) as any,
  data_steward: { policies: ['read'], controls: ['read'], models: ['read'], datasets: ['read','write','delete'], agents: ['read'], vendors: ['read'], bias_audits: ['read','write'], evidence: ['read','write'], hitl: ['read'], regulations: ['read'], shadow_ai: ['read'], trust_engine: ['read'], settings: [], users: [] } as any,
  security_analyst: { policies: ['read'], controls: ['read','write'], models: ['read'], datasets: ['read'], agents: ['read','write'], vendors: ['read'], bias_audits: ['read'], evidence: ['read'], hitl: ['read','write','approve'], regulations: ['read'], shadow_ai: ['read','write','delete'], trust_engine: ['read','write','configure'], settings: [], users: [] } as any,
};

const mockUsers: User[] = [
  { id: 'USR-001', name: 'Admin User', email: 'admin@sentinel.ai', role: 'admin', department: 'Engineering' },
  { id: 'USR-002', name: 'Priya Sharma', email: 'priya@sentinel.ai', role: 'compliance_officer', department: 'Compliance' },
  { id: 'USR-003', name: 'James Wilson', email: 'james@sentinel.ai', role: 'model_owner', department: 'ML Engineering' },
  { id: 'USR-004', name: 'Elena Rodriguez', email: 'elena@sentinel.ai', role: 'auditor', department: 'Internal Audit' },
  { id: 'USR-005', name: 'Sarah Chen', email: 'sarah@sentinel.ai', role: 'data_steward', department: 'Data Governance' },
];

interface RBACState {
  currentUser: User;
  users: User[];
  hasPermission: (resource: Resource, permission: Permission) => boolean;
  setCurrentUser: (user: User) => void;
  switchRole: (role: RBACRole) => void;
}

export const useRBAC = create<RBACState>((set, get) => ({
  currentUser: mockUsers[0],
  users: mockUsers,
  hasPermission: (resource, permission) => {
    const role = get().currentUser.role;
    const perms = rolePermissions[role]?.[resource] || [];
    return perms.includes(permission);
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  switchRole: (role) => set(s => ({ currentUser: { ...s.currentUser, role } })),
}));

export { rolePermissions };
export type { Permission, Resource };
