/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 */
import { useTenantContext } from '../context/TenantContext'

/**
 * Primary hook for reading the caller's tenancy. Prefer this over
 * reading JWT / Supabase session directly anywhere in the app.
 *
 * Returned `orgId` is guaranteed non-null when `status === 'ready'`.
 */
export function useTenant() {
  return useTenantContext()
}

/**
 * Guard hook — throws if called outside a ready tenancy context.
 * Use inside mutation handlers / services that MUST have an org.
 */
export function useRequiredOrgId(): string {
  const { orgId, status } = useTenantContext()
  if (status !== 'ready' || !orgId) {
    throw new Error(
      `useRequiredOrgId: tenancy not ready (status=${status}). ` +
        `Render an AuthGuard ancestor.`,
    )
  }
  return orgId
}
