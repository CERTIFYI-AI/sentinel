// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// NOTE: Auto-generated scaffold — server-side only. No client-side secrets.

import type { IntegrationHandler, IntegrationDescriptor, IntegrationContext, NotifyPayload } from "./types";

export const descriptor: IntegrationDescriptor = {
  id: "msteams",
  name: "Microsoft Teams",
  category: "chatops",
  auth: "oauth2",
  docs_url: "https://docs.certifyi.ai/integrations/msteams",
  capabilities: ["notify"] as const,
};

async function notify(ctx: IntegrationContext, p: NotifyPayload): Promise<void> {
  // Delivery implemented at GA integration wiring; scaffold validates shape.
  void ctx;
  void p;
}

export const handler: IntegrationHandler = {
  descriptor,
  notify,
};

export default handler;
