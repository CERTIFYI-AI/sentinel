/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 */
import { useTenantContext } from '../context/TenantContext'

export function useTenant() {
  return useTenantContext()
}

export function useRequiredOrgId(): string {
  const { orgId, status } = useTenantContext()
  if (status !== 'ready' || !orgId) {
    return 'default'
  }
  return orgId
}
