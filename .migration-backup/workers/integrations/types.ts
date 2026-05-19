// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * Integration scaffolding — shared types.
 *
 * All integrations are server-side only. Credentials live in
 * `integration_credentials` (KMS-encrypted, org-scoped, RLS-protected).
 * No client-side secrets. All third-party calls originate from Workers.
 */

export type IntegrationCategory =
  | "chatops"
  | "ticketing"
  | "identity"
  | "source_control"
  | "cloud"
  | "observability"
  | "crm"
  | "docs"
  | "pm"
  | "privacy";

export interface IntegrationDescriptor {
  readonly id: string; // stable slug
  readonly name: string; // display name
  readonly category: IntegrationCategory;
  readonly auth: "oauth2" | "api_key" | "bearer" | "webhook";
  readonly docs_url: string;
  readonly capabilities: readonly IntegrationCapability[];
}

export type IntegrationCapability =
  | "notify"
  | "create_ticket"
  | "sync_users"
  | "sync_events"
  | "fetch_evidence"
  | "attest";

export interface IntegrationContext {
  readonly orgId: string;
  readonly credentials: Readonly<Record<string, string>>;
  readonly signal: AbortSignal;
}

export interface NotifyPayload {
  readonly title: string;
  readonly body: string;
  readonly severity?: "info" | "warning" | "critical";
  readonly link?: string;
}

export interface IntegrationHandler {
  readonly descriptor: IntegrationDescriptor;
  readonly notify?: (ctx: IntegrationContext, p: NotifyPayload) => Promise<void>;
}
