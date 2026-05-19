#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Generate 22 integration stub files under workers/integrations/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "workers", "integrations");

const INTEGRATIONS = [
  { id: "slack",       name: "Slack",        category: "chatops",        auth: "oauth2",  caps: ["notify"] },
  { id: "msteams",     name: "Microsoft Teams", category: "chatops",     auth: "oauth2",  caps: ["notify"] },
  { id: "jira",        name: "Jira",         category: "ticketing",      auth: "oauth2",  caps: ["create_ticket"] },
  { id: "servicenow",  name: "ServiceNow",   category: "ticketing",      auth: "oauth2",  caps: ["create_ticket"] },
  { id: "okta",        name: "Okta",         category: "identity",       auth: "oauth2",  caps: ["sync_users", "sync_events"] },
  { id: "azure_ad",    name: "Microsoft Entra ID", category: "identity", auth: "oauth2",  caps: ["sync_users", "sync_events"] },
  { id: "github",      name: "GitHub",       category: "source_control", auth: "oauth2",  caps: ["fetch_evidence", "attest"] },
  { id: "gitlab",      name: "GitLab",       category: "source_control", auth: "oauth2",  caps: ["fetch_evidence", "attest"] },
  { id: "aws",         name: "AWS",         category: "cloud",           auth: "api_key", caps: ["fetch_evidence"] },
  { id: "gcp",         name: "Google Cloud", category: "cloud",          auth: "oauth2",  caps: ["fetch_evidence"] },
  { id: "azure",       name: "Azure",       category: "cloud",           auth: "oauth2",  caps: ["fetch_evidence"] },
  { id: "splunk",      name: "Splunk",      category: "observability",   auth: "bearer",  caps: ["sync_events"] },
  { id: "datadog",     name: "Datadog",     category: "observability",   auth: "api_key", caps: ["sync_events", "notify"] },
  { id: "pagerduty",   name: "PagerDuty",   category: "observability",   auth: "bearer",  caps: ["notify"] },
  { id: "zendesk",     name: "Zendesk",     category: "ticketing",       auth: "oauth2",  caps: ["create_ticket"] },
  { id: "salesforce",  name: "Salesforce",  category: "crm",             auth: "oauth2",  caps: ["sync_users", "create_ticket"] },
  { id: "hubspot",     name: "HubSpot",     category: "crm",             auth: "oauth2",  caps: ["sync_users"] },
  { id: "notion",      name: "Notion",      category: "docs",            auth: "oauth2",  caps: ["fetch_evidence"] },
  { id: "linear",      name: "Linear",      category: "pm",              auth: "oauth2",  caps: ["create_ticket"] },
  { id: "asana",       name: "Asana",       category: "pm",              auth: "oauth2",  caps: ["create_ticket"] },
  { id: "confluence",  name: "Confluence",  category: "docs",            auth: "oauth2",  caps: ["fetch_evidence"] },
  { id: "onetrust",    name: "OneTrust",    category: "privacy",         auth: "api_key", caps: ["sync_events"] },
];

const HEADER = `// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// NOTE: Auto-generated scaffold — server-side only. No client-side secrets.
`;

function stub(i) {
  const capsArr = JSON.stringify(i.caps);
  const hasNotify = i.caps.includes("notify");
  return `${HEADER}
import type { IntegrationHandler, IntegrationDescriptor${hasNotify ? ", IntegrationContext, NotifyPayload" : ""} } from "./types";

export const descriptor: IntegrationDescriptor = {
  id: "${i.id}",
  name: "${i.name}",
  category: "${i.category}",
  auth: "${i.auth}",
  docs_url: "https://docs.certifyi.ai/integrations/${i.id}",
  capabilities: ${capsArr} as const,
};

${hasNotify ? `async function notify(ctx: IntegrationContext, p: NotifyPayload): Promise<void> {
  // Delivery implemented at GA integration wiring; scaffold validates shape.
  void ctx;
  void p;
}
` : ""}
export const handler: IntegrationHandler = {
  descriptor,
  ${hasNotify ? "notify," : ""}
};

export default handler;
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const i of INTEGRATIONS) {
  const file = path.join(OUT_DIR, `${i.id}.ts`);
  fs.writeFileSync(file, stub(i), "utf8");
}

// index.ts aggregator
const imports = INTEGRATIONS.map((i) => `import ${i.id} from "./${i.id}";`).join("\n");
const map = INTEGRATIONS.map((i) => `  ${i.id},`).join("\n");
const indexContent = `${HEADER}
${imports}
import type { IntegrationHandler } from "./types";

export const INTEGRATIONS: Readonly<Record<string, IntegrationHandler>> = {
${map}
};

export const INTEGRATION_IDS = Object.keys(INTEGRATIONS) as readonly string[];

export function getIntegration(id: string): IntegrationHandler | undefined {
  return INTEGRATIONS[id];
}
`;
fs.writeFileSync(path.join(OUT_DIR, "index.ts"), indexContent, "utf8");

console.log(`Generated ${INTEGRATIONS.length} integration stubs → ${OUT_DIR}`);
