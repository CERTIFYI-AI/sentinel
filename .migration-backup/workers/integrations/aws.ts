// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// NOTE: Auto-generated scaffold — server-side only. No client-side secrets.

import type { IntegrationHandler, IntegrationDescriptor } from "./types";

export const descriptor: IntegrationDescriptor = {
  id: "aws",
  name: "AWS",
  category: "cloud",
  auth: "api_key",
  docs_url: "https://docs.certifyi.ai/integrations/aws",
  capabilities: ["fetch_evidence"] as const,
};


export const handler: IntegrationHandler = {
  descriptor,
  
};

export default handler;
