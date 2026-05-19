export type PermissionAction = 'read' | 'write' | 'delete' | 'export' | 'admin' | 'execute'

export interface Permission {
  id: string
  key: string
  label: string
  module: string
  section: string
  action: PermissionAction
  description: string
}

export interface Department {
  id: string
  name: string
  code: string
  description: string
  headCount: number
  createdAt: string
  updatedAt: string
  status: 'active' | 'inactive'
}

export type RoleColor = 'zinc' | 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'orange'

export interface Role {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
  isSystem: boolean
  color: RoleColor
  userCount: number
  createdAt: string
  updatedAt: string
}

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export interface ACUser {
  id: string
  firstName: string
  lastName: string
  email: string
  departmentId: string
  roleIds: string[]
  status: UserStatus
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface AuditEvent {
  id: string
  timestamp: string
  actor: string
  action: string
  resourceType: 'User' | 'Role' | 'Department'
  resourceId: string
  resourceName: string
  details: string
}
