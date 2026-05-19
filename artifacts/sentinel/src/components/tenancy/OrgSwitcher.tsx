/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * OrgSwitcher — compact combobox mounted in the global header.
 * Shows the active org, lists every org the caller belongs to, and
 * delegates actual switching to TenantContext.switchOrg (which
 * refreshes the JWT and invalidates query caches).
 */
import { CaretDown, Check, Buildings, Warning } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import { useTenant } from '../../hooks/useTenant'

export function OrgSwitcher() {
  const { orgId, org, orgs, status, switchOrg } = useTenant()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function handleSwitch(targetId: string) {
    if (targetId === orgId) {
      setOpen(false)
      return
    }
    setBusy(targetId)
    setErr(null)
    try {
      await switchOrg(targetId)
      setOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (status === 'unauthenticated') return null
  if (status === 'loading') {
    return (
      <div
        aria-label="Loading active organization"
        style={{
          width: 160,
          height: 32,
          borderRadius: 6,
          background: 'hsl(var(--bg-raised))',
          opacity: 0.6,
        }}
      />
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Active organization: ${org?.name ?? 'Unknown'}. Click to switch.`}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--bg-raised))',
          borderRadius: 6,
          color: 'hsl(var(--text-1))',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          minWidth: 160,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
          <Buildings size={14} weight="duotone" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {org?.name ?? 'No organization'}
          </span>
        </span>
        <CaretDown size={12} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Organizations"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: 240,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'hsl(var(--bg-raised))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            zIndex: 50,
            padding: 4,
            margin: 0,
            listStyle: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {orgs.length === 0 && (
            <li style={{ padding: 8, fontSize: 12, color: 'hsl(var(--text-2))' }}>
              You belong to no organizations.
            </li>
          )}
          {orgs.map(o => {
            const active = o.id === orgId
            const loading = busy === o.id
            return (
              <li key={o.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSwitch(o.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '8px 10px',
                    background: active ? 'hsl(var(--accent-soft))' : 'transparent',
                    border: 'none',
                    borderRadius: 4,
                    color: 'hsl(var(--text-1))',
                    fontSize: 13,
                    cursor: loading ? 'wait' : 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: active ? 600 : 500 }}>{o.name}</span>
                    <span style={{ fontSize: 11, color: 'hsl(var(--text-2))' }}>
                      {o.slug} · {o.plan}
                    </span>
                  </span>
                  {active && <Check size={14} weight="bold" />}
                </button>
              </li>
            )
          })}
          {err && (
            <li
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                marginTop: 4,
                background: 'hsl(var(--danger-soft))',
                color: 'hsl(var(--danger))',
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <Warning size={12} /> {err}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
