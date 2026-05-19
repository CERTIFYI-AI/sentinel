// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// NOTE: Auto-generated scaffold — server-side only. No client-side secrets.

import type { IntegrationHandler, IntegrationDescriptor } from "./types";

export const descriptor: IntegrationDescriptor = {
  id: "azure_ad",
  name: "Microsoft Entra ID",
  category: "identity",
  auth: "oauth2",
  docs_url: "https://docs.certifyi.ai/integrations/azure_ad",
  capabilities: ["sync_users","sync_events"] as const,
};


export const handler: IntegrationHandler = {
  descriptor,
  
};

export default handler;
