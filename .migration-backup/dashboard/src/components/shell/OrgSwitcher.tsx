// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// C.4 — Tenant/org switcher in the top header.
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { ChevronDown, Building2 } from 'lucide-react'

interface OrgOption {
  id: string
  name: string
  slug: string
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<OrgOption[]>([])
  const [current, setCurrent] = useState<OrgOption | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function loadOrgs() {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return
      const { data } = await supabase
        .from('user_org_memberships')
        .select('org_id, organizations(id, name, slug)')
        .eq('user_id', user.user.id)
      if (!data?.length) {
        // Fallback: single org from JWT claim
        const { data: { session } } = await supabase.auth.getSession()
        const orgId = session?.user?.user_metadata?.org_id
        if (orgId) {
          const { data: org } = await supabase.from('organizations').select('id, name, slug').eq('id', orgId).single()
          if (org) { setOrgs([org]); setCurrent(org) }
        }
        return
      }
      const orgList: OrgOption[] = data
        .map((m: Record<string, unknown>) => (m.organizations as OrgOption | null))
        .filter((o): o is OrgOption => o !== null)
      setOrgs(orgList)
      setCurrent(orgList[0] ?? null)
    }
    loadOrgs()
  }, [])

  if (!current) return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-400 border border-zinc-200">
      <Building2 size={12} />
      <span>No org</span>
    </div>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-zinc-700 border border-zinc-200 hover:border-zinc-300 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#368F4D]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Current organization: ${current.name}`}
      >
        <Building2 size={12} className="text-[#368F4D]" />
        <span className="max-w-[120px] truncate">{current.name}</span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && orgs.length > 1 && (
        <div
          role="listbox"
          aria-label="Select organization"
          className="absolute top-full left-0 mt-1 z-50 bg-white border border-zinc-200 rounded shadow-lg min-w-[180px]"
        >
          {orgs.map(org => (
            <button
              key={org.id}
              role="option"
              aria-selected={org.id === current.id}
              onClick={() => { setCurrent(org); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 flex items-center gap-2 ${org.id === current.id ? 'font-semibold text-[#368F4D]' : 'text-zinc-700'}`}
            >
              <Building2 size={11} />
              {org.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
