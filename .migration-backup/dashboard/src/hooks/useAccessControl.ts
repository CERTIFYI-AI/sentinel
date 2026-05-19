import { useState, useEffect, useCallback } from 'react'
import type { ACUser, Role, Department, UserStatus } from '../features/access-control/types'
import { fetchUsers, createUser, updateUser, deleteUser, suspendUser, fetchRoles, createRole, updateRole, deleteRole, fetchDepartments, createDepartment, updateDepartment, deleteDepartment } from '../lib/supabase-access-control'

export function useUsers() {
  const [users, setUsers] = useState<ACUser[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => { setLoading(true); setUsers(await fetchUsers()); setLoading(false) }, [])
  useEffect(() => { refresh() }, [refresh])
  return { users, setUsers, loading, refresh }
}

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => { setLoading(true); setRoles(await fetchRoles()); setLoading(false) }, [])
  useEffect(() => { refresh() }, [refresh])
  return { roles, setRoles, loading, refresh }
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => { setLoading(true); setDepartments(await fetchDepartments()); setLoading(false) }, [])
  useEffect(() => { refresh() }, [refresh])
  return { departments, setDepartments, loading, refresh }
}

export { createUser, updateUser, deleteUser, suspendUser, createRole, updateRole, deleteRole, createDepartment, updateDepartment, deleteDepartment }
