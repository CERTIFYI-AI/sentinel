// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// WS0.5 — Shared zod schemas consumed by dashboard forms AND Worker
// request validators. Single source of truth: a field validated here
// is validated identically on both sides.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitive refinements
// ---------------------------------------------------------------------------

export const uuid = z.string().uuid();
export const nonEmptyString = z.string().trim().min(1);
export const isoDate = z.string().datetime({ offset: true });
// Money as integer minor units + ISO 4217 — matches user constraint.
export const money = z.object({
  amount: z.number().int(),
  currency: z.string().length(3),
});

// ---------------------------------------------------------------------------
// Common server-managed columns. Forms must strip these before submit;
// Workers must reject them as untrusted input.
// ---------------------------------------------------------------------------

export const serverManagedKeys = [
  "id",
  "org_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "deleted_at",
] as const;

// ---------------------------------------------------------------------------
// Risk — representative cross-module example.
// ---------------------------------------------------------------------------

export const riskSeverity = z.enum(["low", "medium", "high", "critical"]);
export const riskStatus = z.enum(["open", "mitigated", "accepted", "closed"]);

export const riskInput = z.object({
  title: nonEmptyString.max(200),
  description: z.string().trim().max(4000).optional(),
  severity: riskSeverity,
  status: riskStatus.default("open"),
  owner_id: uuid.nullable().optional(),
  due_date: isoDate.nullable().optional(),
});
export type RiskInput = z.infer<typeof riskInput>;

// ---------------------------------------------------------------------------
// Control — governance module.
// ---------------------------------------------------------------------------

export const controlInput = z.object({
  title: nonEmptyString.max(200),
  description: z.string().trim().max(4000).optional(),
  framework_id: uuid.nullable().optional(),
  owner_id: uuid.nullable().optional(),
  status: z.enum(["draft", "implemented", "tested", "retired"]).default("draft"),
});
export type ControlInput = z.infer<typeof controlInput>;

// ---------------------------------------------------------------------------
// Vendor — third-party management.
// ---------------------------------------------------------------------------

export const vendorInput = z.object({
  name: nonEmptyString.max(200),
  website: z.string().url().nullable().optional(),
  tier: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  status: z.enum(["active", "under_review", "terminated"]).default("active"),
  contact_email: z.string().email().nullable().optional(),
});
export type VendorInput = z.infer<typeof vendorInput>;

// ---------------------------------------------------------------------------
// Export a registry so the Worker side can look up the schema by name
// without hard-coding imports.
// ---------------------------------------------------------------------------

export const SCHEMA_REGISTRY = {
  risk: riskInput,
  control: controlInput,
  vendor: vendorInput,
} as const;

export type SchemaKey = keyof typeof SCHEMA_REGISTRY;
