/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 * See LICENSE for details.
 *
 * TenantContext — single source of truth for the caller's current org.
 *
 * Responsibilities
 *   1. On mount, resolve the active org from:
 *        a. Supabase JWT app_metadata.org_id (primary)
 *        b. user_profiles.org_id (fallback)
 *   2. Provide a stable `orgId`, `org`, and `switchOrg()` API.
 *   3. On switch, refresh the Supabase session (pushes the new
 *      org_id claim into the JWT) and invalidates TanStack Query
 *      caches so every active query re-fetches under the new tenant.
 *   4. Auth changes (signOut, token refresh) re-hydrate automatically.
 *
 * Why not Zustand: TenantContext is the tenancy boundary — everything
 * else (queries, mutations, UI) derives from it. A provider makes the
 * dependency explicit and testable with React Testing Library wrappers.
 */
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  is_active: boolean
  logo_url: string | null
  country: string | null
  industry: string | null
  timezone: string | null
}

interface TenantContextValue {
  orgId: string | null
  org: Organization | null
  orgs: Organization[]
  status: 'loading' | 'ready' | 'unauthenticated' | 'error'
  error: Error | null
  switchOrg: (nextOrgId: string) => Promise<void>
  refresh: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined)

async function resolveOrgIdFromSession(): Promise<string | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data } = await supabase.auth.getSession()
  const claim =
    (data.session?.user?.app_metadata as Record<string, unknown> | undefined)
      ?.org_id
  if (typeof claim === 'string' && claim.length > 0) return claim
  const userId = data.session?.user?.id
  if (!userId) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('org_id')
    .eq('id', userId)
    .maybeSingle()
  const orgId = (profile as { org_id?: string | null } | null)?.org_id
  return typeof orgId === 'string' && orgId.length > 0 ? orgId : null
}

async function loadOrgsForUser(currentOrgId: string | null): Promise<{
  org: Organization | null
  orgs: Organization[]
}> {
  if (!isSupabaseConfigured() || !supabase || !currentOrgId) {
    return { org: null, orgs: [] }
  }
  // RLS on `organizations` exposes only orgs the caller belongs to.
  const { data, error } = await supabase
    .from('organizations')
    .select('id,name,slug,plan,is_active,logo_url,country,industry,timezone')
    .order('name', { ascending: true })
  if (error) throw error
  const orgs = (data ?? []) as Organization[]
  const org = orgs.find(o => o.id === currentOrgId) ?? null
  return { org, orgs }
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [orgId, setOrgId] = useState<string | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [status, setStatus] = useState<TenantContextValue['status']>('loading')
  const [error, setError] = useState<Error | null>(null)

  // Refs mirror state for use inside the auth-event callback (whose closure
  // would otherwise see stale values) — they let hydrate() decide whether a
  // re-hydration may run silently instead of regressing to 'loading'.
  const orgIdRef = useRef<string | null>(null)
  const lastUserIdRef = useRef<string | null>(null)

  const hydrate = useCallback(
    async (signal?: AbortSignal, opts: { silent?: boolean } = {}) => {
      try {
        // Silent re-hydration (e.g. TOKEN_REFRESHED with the same user and an
        // already-resolved org) must NOT regress status to 'loading': pages
        // reading the tenancy would unmount to skeletons — and pages calling
        // useRequiredOrgId() would throw — on every token refresh.
        if (!opts.silent) setStatus('loading')
        setError(null)
        const resolved = await resolveOrgIdFromSession()
        if (signal?.aborted) return
        if (!resolved) {
          orgIdRef.current = null
          setOrgId(null)
          setOrg(null)
          setOrgs([])
          setStatus('unauthenticated')
          return
        }
        const { org: current, orgs: list } = await loadOrgsForUser(resolved)
        if (signal?.aborted) return
        orgIdRef.current = resolved
        setOrgId(resolved)
        setOrg(current)
        setOrgs(list)
        setStatus('ready')
      } catch (err) {
        if (signal?.aborted) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    void hydrate(controller.signal)
    if (!isSupabaseConfigured() || !supabase) return () => controller.abort()
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUserId = session?.user?.id ?? null
      const userChanged = nextUserId !== lastUserIdRef.current
      lastUserIdRef.current = nextUserId
      // Full reset (status → 'loading') only when the authenticated user
      // actually changes: sign-out, or sign-in/user-update as someone else.
      if (
        event === 'SIGNED_OUT' ||
        ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && userChanged)
      ) {
        orgIdRef.current = null
        void hydrate()
        return
      }
      // Same user (TOKEN_REFRESHED, INITIAL_SESSION, repeat SIGNED_IN, …):
      // refresh in place, keeping 'ready' when an org is already resolved.
      void hydrate(undefined, { silent: orgIdRef.current != null })
    })
    return () => {
      controller.abort()
      data.subscription.unsubscribe()
    }
  }, [hydrate])

  const switchOrg = useCallback(
    async (nextOrgId: string) => {
      if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured')
      }
      if (!orgs.some(o => o.id === nextOrgId)) {
        throw new Error(`User is not a member of org ${nextOrgId}`)
      }
      // Ask Postgres to write the new org into app_metadata. Requires
      // a service-role edge function `set-active-org`; the function is
      // a thin wrapper that validates membership via user_roles before
      // calling supabase.auth.admin.updateUserById().
      const { error: rpcErr } = await supabase.functions.invoke(
        'set-active-org',
        { body: { org_id: nextOrgId } },
      )
      if (rpcErr) throw rpcErr
      // Refresh the session so the new JWT carries the new claim.
      const { error: refreshErr } = await supabase.auth.refreshSession()
      if (refreshErr) throw refreshErr
      // Blow away every cached query — tenant-scoped results are stale.
      await queryClient.cancelQueries()
      queryClient.clear()
      await hydrate()
    },
    [orgs, queryClient, hydrate],
  )

  const value = useMemo<TenantContextValue>(
    () => ({ orgId, org, orgs, status, error, switchOrg, refresh: hydrate }),
    [orgId, org, orgs, status, error, switchOrg, hydrate],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) {
    throw new Error('useTenantContext must be used inside <TenantProvider/>')
  }
  return ctx
}

/** Internal — used by test harness to construct a client. */
export function _bindTenantForTests(_client: QueryClient) {
  /* no-op marker for type visibility */
}
