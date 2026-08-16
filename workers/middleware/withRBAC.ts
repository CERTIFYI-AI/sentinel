/*
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
 *
 * withRBAC — composes with withTenant to enforce resource+action
 * authorisation before a business handler sees the request.
 *
 * Invariants:
 *   - Never trusts roles claimed in the JWT alone for authorisation
 *     decisions on mutating endpoints. Roles from the JWT are an
 *     optimistic hint; the authoritative check is auth.has_permission()
 *     executed inside Postgres under the caller's JWT, which is subject
 *     to RLS and cannot be impersonated from the edge.
 *   - Returns a preformatted 403 with an opaque code on denial. Never
 *     leaks which permission was missing to the client.
 *   - Short-circuits the request: if the check fails the business
 *     handler never runs.
 *
 * Usage:
 *   const tenant = withTenant({ jwtSecret, issuer });
 *   const rbac   = withRBAC({ supabaseUrl, anonKey });
 *
 *   const { ctx, response: authErr } = await tenant(request);
 *   if (authErr) return authErr;
 *   const { ok, response: rbacErr } = await rbac(request, ctx, "risk.update");
 *   if (!ok) return rbacErr;
 *   // …handler runs with ctx…
 */

import type { TenantContext } from "./withTenant";

export interface WithRBACOptions {
  /** Supabase project URL (e.g. https://<ref>.supabase.co). */
  readonly supabaseUrl: string;
  /** Publishable (anon) key — server sends the caller's JWT as the
   *  Authorization bearer so PostgREST runs auth.has_permission() under
   *  the caller's identity. */
  readonly anonKey: string;
  /**
   * Hard timeout for the authorisation check, ms. Default 3000.
   * A failed or slow check must not hang the edge handler; on timeout
   * we fail closed (403).
   */
  readonly timeoutMs?: number;
  /**
   * Optional override for the RPC name. Default `has_permission`.
   * Matches the Postgres helper installed by
   * supabase/migrations/20260421000018_ws04_rbac_depth.sql.
   */
  readonly rpcName?: string;
}

export interface RBACDecision {
  readonly ok: boolean;
  /** Only populated when ok === false. */
  readonly response: Response | null;
}

/** Extract the raw bearer token from the request. Kept separate so tests
 *  can inject a known token. */
function extractBearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? (m[1] ?? null) : null;
}

function denied(code: string): Response {
  return new Response(
    JSON.stringify({ error: "forbidden", code, message: "Forbidden" }),
    { status: 403, headers: { "content-type": "application/json" } },
  );
}

export function withRBAC(options: WithRBACOptions) {
  const timeoutMs = options.timeoutMs ?? 3_000;
  const rpcName = options.rpcName ?? "has_permission";

  return async function check(
    request: Request,
    _ctx: TenantContext,
    required: string,
  ): Promise<RBACDecision> {
    const bearer = extractBearer(request);
    if (!bearer) {
      return { ok: false, response: denied("missing_token") };
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException("timeout", "AbortError")),
      timeoutMs,
    );
    try {
      const url = `${options.supabaseUrl}/rest/v1/rpc/${rpcName}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: options.anonKey,
          authorization: `Bearer ${bearer}`,
          prefer: "return=representation",
        },
        body: JSON.stringify({ perm: required }),
        signal: controller.signal,
      });
      if (!resp.ok) {
        // PostgREST surfaces RLS / permission issues as 403/404. Fail closed.
        return { ok: false, response: denied("policy_denied") };
      }
      const data = (await resp.json()) as unknown;
      if (data === true) return { ok: true, response: null };
      return { ok: false, response: denied("policy_denied") };
    } catch (err) {
      const name = (err as { name?: string } | null)?.name;
      if (name === "AbortError") {
        return { ok: false, response: denied("check_timeout") };
      }
      return { ok: false, response: denied("check_error") };
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Convenience composition: run tenant then RBAC in one call.
 * Returns a single discriminated union so the handler only branches once.
 */
export async function authorize(
  request: Request,
  tenantStep: (r: Request) => Promise<
    | { ctx: TenantContext; response: null }
    | { ctx: null; response: Response }
  >,
  rbacStep: (
    r: Request,
    ctx: TenantContext,
    required: string,
  ) => Promise<RBACDecision>,
  required: string,
): Promise<
  | { ok: true; ctx: TenantContext; response: null }
  | { ok: false; ctx: null; response: Response }
> {
  const t = await tenantStep(request);
  if (t.response) return { ok: false, ctx: null, response: t.response };
  const r = await rbacStep(request, t.ctx, required);
  if (!r.ok && r.response)
    return { ok: false, ctx: null, response: r.response };
  return { ok: true, ctx: t.ctx, response: null };
}
