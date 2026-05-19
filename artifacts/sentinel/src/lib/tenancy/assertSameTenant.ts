/*
 * Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
 *
 * assertSameTenant — belt-and-suspenders cross-tenant guard used by
 * the service layer before any mutation. RLS is the primary defense;
 * this is the secondary check that catches programmer errors (e.g.,
 * passing an org_id pulled from a client-supplied payload).
 *
 * Usage pattern:
 *   const orgId = useRequiredOrgId()
 *   const payload = form.getValues()
 *   assertSameTenant(orgId, payload.org_id, 'createRisk')
 *   await riskService.create(payload)
 */

export class CrossTenantViolationError extends Error {
  constructor(
    readonly expected: string,
    readonly actual: string | null | undefined,
    readonly scope: string,
  ) {
    super(
      `[CrossTenantViolationError] scope="${scope}" expected=${expected} ` +
        `actual=${actual ?? 'null'}. Refusing mutation.`,
    )
    this.name = 'CrossTenantViolationError'
  }
}

/**
 * Throws if `actual` does not match `expected`. Use `null`-safe semantics:
 * a null `actual` is treated as a violation (the caller must set org_id).
 */
export function assertSameTenant(
  expected: string,
  actual: string | null | undefined,
  scope: string,
): void {
  if (!expected) {
    throw new CrossTenantViolationError(expected, actual, scope)
  }
  if (!actual || actual !== expected) {
    throw new CrossTenantViolationError(expected, actual, scope)
  }
}

/**
 * Array variant. Every element of `rows` must satisfy the tenancy match.
 * Returns the validated array for fluent chaining.
 */
export function assertSameTenantAll<T extends { org_id?: string | null }>(
  expected: string,
  rows: readonly T[],
  scope: string,
): readonly T[] {
  for (const [i, r] of rows.entries()) {
    if (!r.org_id || r.org_id !== expected) {
      throw new CrossTenantViolationError(
        expected,
        r.org_id,
        `${scope}[index=${i}]`,
      )
    }
  }
  return rows
}
