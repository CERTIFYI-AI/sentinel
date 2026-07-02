// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// UserSelect — reusable person picker wired to the central Users directory.
// Replaces hardcoded validator/owner/reviewer/approver names across modules.

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUserOptions } from '@/hooks/useUserOptions'

export interface UserSelectProps {
  value?: string
  onChange: (value: string) => void
  /** Restrict the list to roles matching any of these substrings (e.g. ['risk','compliance']). */
  rolesFilter?: string[]
  placeholder?: string
  disabled?: boolean
  /** Match against option id (default) or name — accepts either for seed compatibility. */
  by?: 'id' | 'name'
  className?: string
}

export function UserSelect({
  value, onChange, rolesFilter, placeholder = 'Select person…', disabled, by = 'id', className,
}: UserSelectProps) {
  const { options, loading } = useUserOptions(rolesFilter)

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={loading ? 'Loading people…' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((u) => (
          <SelectItem key={u.id} value={by === 'name' ? u.name : u.id}>
            <span className="flex items-center gap-2">
              <span className="text-[hsl(var(--text-1))]">{u.name}</span>
              <span className="text-[11px] text-[hsl(var(--text-4))]">{u.role}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default UserSelect
