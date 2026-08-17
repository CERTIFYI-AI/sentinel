// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Client-side RBAC surface.
//
// Contract
// --------
//  1. `usePermissions()` fetches the caller's granted permission set
//     exactly once per session (TanStack Query), using
//     `rpc("current_user_permissions")` under the user's JWT so the
//     result is subject to RLS and cannot be impersonated.
//  2. `<Can permission="risk.update">` renders its children iff the
//     caller holds the permission; renders a `fallback` otherwise.
//  3. `<ProtectedRoute permissions={["risk.read"]}>` wraps route
//     elements, redirecting to `/403` when any required permission
//     is missing.
//
// The wildcard matcher is kept in lockstep with the Postgres
// `auth.has_permission` semantics via `packages/rbac/permissions.ts`.

import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { createElement, Fragment, type ReactElement, type ReactNode } from "react";
import { supabase } from "../supabase";
import {
  hasPermission as staticHas,
  type ResourceId,
  type PermissionAction,
  perm as composePerm,
} from "../../../../packages/rbac/permissions";

/** Matches the row shape returned by the Postgres RPC. */
export interface PermissionSet {
  readonly grants: readonly string[];
  readonly roles: readonly string[];
}

const EMPTY: PermissionSet = { grants: [], roles: [] };

/**
 * Fetches the permission set for the currently-authenticated user.
 *
 * The RPC is expected to return:
 *   { grants: text[], roles: text[] }
 * scoped to the caller's current `org_id` (via auth.current_org_id()).
 *
 * See `supabase/migrations/20260421000016_ws03_current_user_permissions.sql`.
 */
export function usePermissions(): {
  readonly data: PermissionSet;
  readonly isLoading: boolean;
  readonly error: unknown;
} {
  const q = useQuery<PermissionSet>({
    queryKey: ["rbac", "current_user_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("current_user_permissions");
      if (error) throw error;
      // Guard against null / unexpected shapes from the RPC.
      const row =
        (Array.isArray(data) ? data[0] : data) as Partial<PermissionSet> | null;
      return {
        grants: Array.isArray(row?.grants) ? row!.grants : [],
        roles: Array.isArray(row?.roles) ? row!.roles : [],
      };
    },
    // Permissions very rarely change mid-session; stale-time 5 min.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
  return {
    data: q.data ?? EMPTY,
    isLoading: q.isLoading,
    error: q.error,
  };
}

/**
 * Synchronous, cache-fed predicate. Use inside render code where you've
 * already called `usePermissions()` in an ancestor and want to branch
 * without another hook call.
 */
export function can(
  grants: readonly string[],
  requirement: string | { resource: ResourceId; action: PermissionAction },
): boolean {
  const required =
    typeof requirement === "string"
      ? requirement
      : composePerm(requirement.resource, requirement.action);
  return staticHas(grants, required);
}

// ---------------------------------------------------------------------------
// <Can>
// ---------------------------------------------------------------------------

export interface CanProps {
  /** One or more required permissions. The caller must hold ALL of them
   *  (AND semantics) — use <CanAny> for OR semantics. */
  readonly permission: string | readonly string[];
  readonly fallback?: ReactNode;
  readonly children: ReactNode;
}

/** Guard that renders children iff the caller holds the required permissions. */
export function Can(props: CanProps): ReactElement | null {
  const { data } = usePermissions();
  const required = Array.isArray(props.permission)
    ? props.permission
    : [props.permission];
  const ok = required.every((r) => staticHas(data.grants, r));
  if (ok) return createElement(Fragment, null, props.children);
  return props.fallback === undefined
    ? null
    : createElement(Fragment, null, props.fallback);
}

/** OR-semantics variant: renders children iff ANY required permission is held. */
export function CanAny(props: CanProps): ReactElement | null {
  const { data } = usePermissions();
  const required = Array.isArray(props.permission)
    ? props.permission
    : [props.permission];
  const ok = required.some((r) => staticHas(data.grants, r));
  if (ok) return createElement(Fragment, null, props.children);
  return props.fallback === undefined
    ? null
    : createElement(Fragment, null, props.fallback);
}

// ---------------------------------------------------------------------------
// <ProtectedRoute>
// ---------------------------------------------------------------------------

export interface ProtectedRouteProps {
  /** Permissions required to view this route. AND semantics. Pass [] to
   *  require only that the user be authenticated. */
  readonly permissions: readonly string[];
  /** Component to render when authorised. */
  readonly children: ReactNode;
  /** Path to redirect to on denial. Default `/403`. */
  readonly denyRedirectTo?: string;
  /** Path to redirect to when unauthenticated. Default `/login`. */
  readonly loginRedirectTo?: string;
  /** Slot for an in-flight permission fetch. Default: null. */
  readonly loadingFallback?: ReactNode;
}

/**
 * Route wrapper. Must be composed INSIDE an auth guard — it assumes
 * the user is already authenticated. It protects against *authorisation*
 * gaps (missing permission), not authentication.
 */
export function ProtectedRoute(
  props: ProtectedRouteProps,
): ReactElement | null {
  const { data, isLoading, error } = usePermissions();
  const location = useLocation();

  if (isLoading) {
    return createElement(Fragment, null, props.loadingFallback ?? null);
  }
  if (error) {
    return createElement(Navigate, {
      to: props.loginRedirectTo ?? "/login",
      state: { from: location, reason: "permission_fetch_failed" },
      replace: true,
    });
  }
  const ok = props.permissions.every((p) => staticHas(data.grants, p));
  if (!ok) {
    return createElement(Navigate, {
      to: props.denyRedirectTo ?? "/403",
      state: { from: location, missing: props.permissions },
      replace: true,
    });
  }
  return createElement(Fragment, null, props.children);
}

// Re-exports so consumers import exclusively from this barrel.
export {
  PERMISSION_ACTIONS,
  RESOURCES,
  perm,
  hasPermission,
  permissionMatches,
  type PermissionAction,
  type ResourceId,
  type ResourceKey,
  type CanonicalRole,
} from "../../../../packages/rbac/permissions";

// Legacy surface preserved for existing consumers (JitElevation page +
// rbac.test.ts). New code should prefer <Can> / usePermissions(), but the
// static role → permission matrix remains useful for role-picker UIs.
export {
  CANONICAL_ROLES,
  ROLE_DISPLAY,
  ROLE_PERMISSIONS,
  matchesWildcard,
  roleHasPermission,
  anyRoleHasPermission,
  type OrgRole,
} from "./roles";
