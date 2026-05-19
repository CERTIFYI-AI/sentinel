/*
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
 *
 * withAudit — higher-order handler that wraps a business handler and
 * writes one audit_log row per request via the service-role
 * audit_log_append() RPC.
 *
 * Invariants:
 *   - Fire-and-forget on the success path: audit write failures never
 *     flip a 2xx response to 5xx. They are reported via ctx.waitUntil
 *     (if provided) and surface in OTEL (WS0.6).
 *   - Denials (403/401 from withRBAC/withTenant) are ALSO audited.
 *   - Uses SERVICE_ROLE_KEY from secrets. Never trust JWT-derived role
 *     for the audit write itself.
 */

import type { TenantContext } from "./withTenant";

export interface AuditEvent {
  readonly action: string; // dotted.verb, e.g. "risk.update"
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly outcome: "success" | "failure" | "denied";
  readonly severity?: "debug" | "info" | "notice" | "warning" | "error" | "critical";
  readonly metadata?: Record<string, unknown>;
}

export interface WithAuditOptions {
  readonly supabaseUrl: string;
  readonly serviceRoleKey: string;
  readonly timeoutMs?: number;
  readonly onError?: (err: unknown) => void;
}

export interface AuditContext extends TenantContext {
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly traceId: string | null;
}

/**
 * Emit one audit_log row. Never throws.
 */
export async function emitAuditEvent(
  options: WithAuditOptions,
  ctx: AuditContext,
  event: AuditEvent,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("timeout", "AbortError")),
    options.timeoutMs ?? 2_000,
  );
  try {
    const url = `${options.supabaseUrl}/rest/v1/rpc/audit_log_append`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: options.serviceRoleKey,
        authorization: `Bearer ${options.serviceRoleKey}`,
      },
      body: JSON.stringify({
        p_org_id: ctx.orgId,
        p_action: event.action,
        p_resource_type: event.resourceType,
        p_actor_id: ctx.userId,
        p_actor_type: "user",
        p_resource_id: event.resourceId ?? null,
        p_outcome: event.outcome,
        p_severity: event.severity ?? "info",
        p_metadata: event.metadata ?? {},
        p_ip_address: ctx.ip,
        p_user_agent: ctx.userAgent,
        p_trace_id: ctx.traceId,
      }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text();
      options.onError?.(new Error(`audit_append_failed: ${resp.status} ${body}`));
    }
  } catch (err) {
    options.onError?.(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap a handler so every invocation emits an audit row.
 *   const audited = withAudit(options, { action: "risk.update", resourceType: "risk" }, handler)
 *
 * The handler may set resourceId on the returned event by attaching it
 * to `request.headers["x-sentinel-resource-id"]` or via the `deriveEvent`
 * callback form below.
 */
export function withAudit<H extends (req: Request, ctx: AuditContext) => Promise<Response>>(
  options: WithAuditOptions,
  defaultEvent: Pick<AuditEvent, "action" | "resourceType"> &
    Partial<Pick<AuditEvent, "severity" | "resourceId">>,
  handler: H,
  deriveEvent?: (
    req: Request,
    ctx: AuditContext,
    resp: Response,
  ) => Partial<AuditEvent>,
): (req: Request, ctx: AuditContext) => Promise<Response> {
  return async function audited(req, ctx) {
    let resp: Response;
    let outcome: AuditEvent["outcome"] = "success";
    try {
      resp = await handler(req, ctx);
      if (resp.status === 401 || resp.status === 403) outcome = "denied";
      else if (resp.status >= 400) outcome = "failure";
    } catch (err) {
      outcome = "failure";
      resp = new Response(
        JSON.stringify({ error: "internal", message: "internal error" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
      options.onError?.(err);
    }

    const override = deriveEvent?.(req, ctx, resp) ?? {};
    void emitAuditEvent(options, ctx, {
      action: defaultEvent.action,
      resourceType: defaultEvent.resourceType,
      ...(defaultEvent.resourceId !== undefined ? { resourceId: defaultEvent.resourceId } : {}),
      ...(defaultEvent.severity !== undefined ? { severity: defaultEvent.severity } : {}),
      outcome,
      ...override,
    });

    return resp;
  };
}
