// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// useUserOptions — normalized directory of assignable people for owner /
// validator / reviewer / approver dropdowns. Sources the central Users
// (Access Control) directory and falls back to the seed USERS when the tenant
// has none, so selects are never empty. `useUsers` (ACUser) already exists in
// useAccessControl; this adapts it to a lightweight {id,name,role} option.

import { useMemo } from 'react'
import { useUsers } from './useAccessControl'
import { USERS } from '../data/seed'

export interface UserOption {
  id: string
  name: string
  role: string
  department?: string
}

/** @param rolesFilter optional case-insensitive substring match on role. */
export function useUserOptions(rolesFilter?: string[]) {
  const { users, loading } = useUsers()

  const options = useMemo<UserOption[]>(() => {
    const fromAc: UserOption[] = (users ?? []).map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      role: u.roleIds?.[0] ?? 'member',
      department: u.departmentId,
    }))
    const base = fromAc.length > 0
      ? fromAc
      : USERS.map((u) => ({ id: u.id, name: u.name, role: u.role, department: u.department }))

    if (!rolesFilter?.length) return base
    const needles = rolesFilter.map((r) => r.toLowerCase())
    const filtered = base.filter((u) => needles.some((n) => u.role.toLowerCase().includes(n)))
    return filtered.length > 0 ? filtered : base // never strand the caller with an empty list
  }, [users, rolesFilter])

  return { options, loading }
}
