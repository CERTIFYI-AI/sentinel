// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, expect, it } from "vitest";
import {
  toCsv,
  toNdjson,
  toJson,
  formatExport,
  type AuditEntry,
} from "@/services/auditService";

const ROW: AuditEntry = {
  id: "00000000-0000-0000-0000-000000000001",
  org_id: "00000000-0000-0000-0000-000000000000",
  sequence_no: 42,
  occurred_at: "2026-04-21T12:00:00.000Z",
  actor_id: null,
  actor_type: "user",
  action: "risk.update",
  resource_type: "risk",
  resource_id: "R-1",
  outcome: "success",
  severity: "info",
  metadata: { note: "hello, world" },
  previous_hash: null,
  row_hash: "abc",
  ip_address: null,
  user_agent: null,
  trace_id: null,
  created_at: "2026-04-21T12:00:00.000Z",
};

describe("audit exporters", () => {
  it("csv escapes commas and quotes", () => {
    const csv = toCsv([{ ...ROW, resource_id: "a,b\"c" }]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("sequence_no");
    expect(lines[1]).toContain('"a,b""c"');
  });

  it("ndjson is one JSON per line, no trailing newline", () => {
    const body = toNdjson([ROW, { ...ROW, sequence_no: 43 }]);
    const lines = body.split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).sequence_no).toBe(42);
    expect(JSON.parse(lines[1]!).sequence_no).toBe(43);
  });

  it("json is pretty-printed valid JSON array", () => {
    const body = toJson([ROW]);
    expect(body.startsWith("[")).toBe(true);
    expect(JSON.parse(body)).toHaveLength(1);
  });

  it("formatExport returns correct mime + ext", () => {
    expect(formatExport([ROW], "csv").mime).toBe("text/csv; charset=utf-8");
    expect(formatExport([ROW], "json").ext).toBe("json");
    expect(formatExport([ROW], "ndjson").mime).toBe("application/x-ndjson");
  });
});
