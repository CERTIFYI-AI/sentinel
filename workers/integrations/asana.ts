// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// NOTE: Auto-generated scaffold — server-side only. No client-side secrets.

import type { IntegrationHandler, IntegrationDescriptor } from "./types";

export const descriptor: IntegrationDescriptor = {
  id: "asana",
  name: "Asana",
  category: "pm",
  auth: "oauth2",
  docs_url: "https://docs.certifyi.ai/integrations/asana",
  capabilities: ["create_ticket"] as const,
};


export const handler: IntegrationHandler = {
  descriptor,
  
};

export default handler;
