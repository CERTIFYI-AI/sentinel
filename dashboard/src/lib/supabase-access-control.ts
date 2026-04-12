/**
 * Supabase Access Control API Layer
 * Maps Supabase DB (snake_case) to frontend types (camelCase)
 * Falls back gracefully if Supabase is not configured
 */
import { supabase } from './supabase'
import type { ACUser, Role, Department } from '../features/access-control/types'

// ===== DB row types (snake_case from Supabase) =====
interface DBUserProfile {
  id: string
  org_id: string
  first_name: string
  last_name: string
  display_name?: string
  avatar_url?: string | null
  job_title?: string | null
  phone?: string | null
  status: string
  last_login_at?: string | null
  email?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

interface DBRole {
  id: string
  org_id: string
  name: string
  code: string
  description: string | null
  color: string
  is_system: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}

interface DBDepartment {
  id: string
  org_id: string
  name: string
  code: string
  description: string | null
  head_count: number
  status: string
  created_at: string
  updated_at: string
}

// ===== Mappers: DB -> Frontend =====
function mapUser(row: DBUserProfile, roleIds: string[]): ACUser {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email || '',
    departmentId: '', // filled later from user_departments
    roleIds,
    status: row.status as ACUser['status'],
    lastLogin: row.last_login_at || undefined,
    createdAt: row.created_at?.split('T')[0] || '',
    updatedAt: row.updated_at?.split('T')[0] || '',
  }
}

function mapRole(row: DBRole, userCount: number): Role {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    isSystem: row.is_system,
    color: (row.color || 'zinc') as Role['color'],
    userCount,
    createdAt: row.created_at?.split('T')[0] || '',
    updatedAt: row.updated_at?.split('T')[0] || '',
  }
}

function mapDepartment(row: DBDepartment): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    headCount: row.head_count || 0,
    status: row.status as Department['status'],
    createdAt: row.created_at?.split('T')[0] || '',
    updatedAt: row.updated_at?.split('T')[0] || '',
  }
}

// ===== FETCH FUNCTIONS =====

export async function fetchUsers(): Promise<ACUser[]> {
  if (!supabase) return []
  
  // Get user profiles
  const { data: profiles, error: profileErr } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (profileErr) throw profileErr
  if (!profiles || profiles.length === 0) return []
  
  // Get all user_roles
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('user_id, role_id')
  
  // Get all user_departments
  const { data: userDepts } = await supabase
    .from('user_departments')
    .select('user_id, department_id, is_primary')
  
  // Build lookup maps
  const roleMap = new Map<string, string[]>()
  for (const ur of userRoles || []) {
    if (!roleMap.has(ur.user_id)) roleMap.set(ur.user_id, [])
    roleMap.get(ur.user_id)!.push(ur.role_id)
  }
  
  const deptMap = new Map<string, string>()
  for (const ud of userDepts || []) {
    if (ud.is_primary || !deptMap.has(ud.user_id)) {
      deptMap.set(ud.user_id, ud.department_id)
    }
  }
  
  return profiles.map((p: DBUserProfile) => {
    const user = mapUser(p, roleMap.get(p.id) || [])
    user.departmentId = deptMap.get(p.id) || ''
    return user
  })
}

export async function fetchRoles(): Promise<Role[]> {
  if (!supabase) return []
  
  const { data: roles, error } = await supabase
    .from('roles')
    .select('*')
    .order('is_system', { ascending: false })
    .order('name')
  if (error) throw error
  if (!roles) return []
  
  // Count users per role
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('role_id')
  
  const countMap = new Map<string, number>()
  for (const ur of userRoles || []) {
    countMap.set(ur.role_id, (countMap.get(ur.role_id) || 0) + 1)
  }
  
  return roles.map((r: DBRole) => mapRole(r, countMap.get(r.id) || 0))
}

export async function fetchDepartments(): Promise<Department[]> {
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  if (error) throw error
  return (data || []).map((d: DBDepartment) => mapDepartment(d))
}

// ===== USER CRUD =====

export async function createUser(user: Partial<ACUser>): Promise<ACUser | null> {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      email: user.email || '',
      status: user.status || 'pending',
    })
    .select()
    .single()
  if (error) throw error
  
  // Assign department
  if (user.departmentId && data) {
    await supabase.from('user_departments').insert({
      user_id: data.id,
      department_id: user.departmentId,
      is_primary: true,
    })
  }
  
  // Assign roles
  if (user.roleIds && user.roleIds.length > 0 && data) {
    await supabase.from('user_roles').insert(
      user.roleIds.map(rid => ({ user_id: data.id, role_id: rid }))
    )
  }
  
  return mapUser(data as DBUserProfile, user.roleIds || [])
}

export async function updateUser(id: string, updates: Partial<ACUser>): Promise<void> {
  if (!supabase) return
  
  const profileUpdates: Record<string, unknown> = {}
  if (updates.firstName !== undefined) profileUpdates.first_name = updates.firstName
  if (updates.lastName !== undefined) profileUpdates.last_name = updates.lastName
  if (updates.email !== undefined) profileUpdates.email = updates.email
  if (updates.status !== undefined) profileUpdates.status = updates.status
  
  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase
      .from('user_profiles')
      .update(profileUpdates)
      .eq('id', id)
    if (error) throw error
  }
  
  // Update department if changed
  if (updates.departmentId !== undefined) {
    await supabase.from('user_departments').delete().eq('user_id', id)
    if (updates.departmentId) {
      await supabase.from('user_departments').insert({
        user_id: id,
        department_id: updates.departmentId,
        is_primary: true,
      })
    }
  }
  
  // Update roles if changed
  if (updates.roleIds !== undefined) {
    await supabase.from('user_roles').delete().eq('user_id', id)
    if (updates.roleIds.length > 0) {
      await supabase.from('user_roles').insert(
        updates.roleIds.map(rid => ({ user_id: id, role_id: rid }))
      )
    }
  }
}

export async function deleteUser(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('user_profiles').delete().eq('id', id)
  if (error) throw error
}

export async function suspendUser(id: string, suspend: boolean): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('user_profiles')
    .update({ status: suspend ? 'suspended' : 'active' })
    .eq('id', id)
  if (error) throw error
}

// ===== ROLE CRUD =====

export async function createRole(role: Partial<Role>): Promise<Role | null> {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('roles')
    .insert({
      name: role.name || '',
      code: role.code || '',
      description: role.description || '',
      color: role.color || 'zinc',
      is_system: false,
      permissions: role.permissions || [],
    })
    .select()
    .single()
  if (error) throw error
  return mapRole(data as DBRole, 0)
}

export async function updateRole(id: string, updates: Partial<Role>): Promise<void> {
  if (!supabase) return
  
  const dbUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.code !== undefined) dbUpdates.code = updates.code
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.color !== undefined) dbUpdates.color = updates.color
  if (updates.permissions !== undefined) dbUpdates.permissions = updates.permissions
  
  const { error } = await supabase
    .from('roles')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteRole(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw error
}

// ===== DEPARTMENT CRUD =====

export async function createDepartment(dept: Partial<Department>): Promise<Department | null> {
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('departments')
    .insert({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      head_count: dept.headCount || 0,
      status: dept.status || 'active',
    })
    .select()
    .single()
  if (error) throw error
  return mapDepartment(data as DBDepartment)
}

export async function updateDepartment(id: string, updates: Partial<Department>): Promise<void> {
  if (!supabase) return
  
  const dbUpdates: Record<string, unknown> = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.code !== undefined) dbUpdates.code = updates.code
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.headCount !== undefined) dbUpdates.head_count = updates.headCount
  if (updates.status !== undefined) dbUpdates.status = updates.status
  
  const { error } = await supabase
    .from('departments')
    .update(dbUpdates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteDepartment(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
}
