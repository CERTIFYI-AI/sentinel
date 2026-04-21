// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

describe("WS8 — OpenAPI & integrations", () => {
  it("OpenAPI spec is present and declares version 3.1.0", () => {
    const specPath = path.join(REPO_ROOT, "openapi", "sentinel.yaml");
    expect(fs.existsSync(specPath)).toBe(true);
    const content = fs.readFileSync(specPath, "utf8");
    expect(content).toContain("openapi: 3.1.0");
    expect(content).toContain("title: Sentinel Platform API");
  });

  it("OpenAPI spec declares all core tags", () => {
    const content = fs.readFileSync(
      path.join(REPO_ROOT, "openapi", "sentinel.yaml"),
      "utf8",
    );
    for (const tag of [
      "Frameworks",
      "Controls",
      "Evidence",
      "Incidents",
      "Risks",
      "Vendors",
      "Audit",
      "Webhooks",
    ]) {
      expect(content).toContain(`name: ${tag}`);
    }
  });

  it("ships 22 integration stubs", () => {
    const dir = path.join(REPO_ROOT, "workers", "integrations");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && f !== "types.ts" && f !== "index.ts");
    expect(files).toHaveLength(22);
  });

  it("integration index exports all stubs with descriptors", () => {
    const indexPath = path.join(REPO_ROOT, "workers", "integrations", "index.ts");
    const content = fs.readFileSync(indexPath, "utf8");
    const ids = [
      "slack",
      "msteams",
      "jira",
      "servicenow",
      "okta",
      "azure_ad",
      "github",
      "gitlab",
      "aws",
      "gcp",
      "azure",
      "splunk",
      "datadog",
      "pagerduty",
      "zendesk",
      "salesforce",
      "hubspot",
      "notion",
      "linear",
      "asana",
      "confluence",
      "onetrust",
    ];
    for (const id of ids) {
      expect(content).toContain(`import ${id} from "./${id}";`);
    }
    expect(ids).toHaveLength(22);
  });
});
