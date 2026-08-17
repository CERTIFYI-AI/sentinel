// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// Audit export formatters — folded into services/auditLogService.ts (the
// retired services/auditService.ts targeted a hash-chained schema that was
// never deployed). These operate on the deployed audit_log record shape.

import { describe, expect, it } from "vitest";
import {
  toCsv,
  toNdjson,
  toJson,
  formatExport,
  type AuditLogRecord,
} from "@/services/auditLogService";

const ROW: AuditLogRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  orgId: "00000000-0000-0000-0000-000000000000",
  actorId: null,
  actorName: "Test User",
  actorRole: "admin",
  module: "risk",
  entityType: "risk",
  entityId: "00000000-0000-0000-0000-0000000000aa",
  entityName: "Model drift risk",
  action: "risk.update",
  oldValues: { status: "open" },
  newValues: { status: "assessed" },
  createdAt: "2026-04-21T12:00:00.000Z",
};

describe("audit exporters", () => {
  it("csv escapes commas and quotes", () => {
    const csv = toCsv([{ ...ROW, entityName: 'a,b"c' }]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("createdAt");
    expect(lines[0]).toContain("entityName");
    expect(lines[1]).toContain('"a,b""c"');
  });

  it("csv renders null fields as empty cells", () => {
    const csv = toCsv([{ ...ROW, actorRole: null, entityId: null }]);
    const lines = csv.split("\n");
    expect(lines[1].endsWith(",")).toBe(true);
  });

  it("ndjson is one JSON per line, no trailing newline", () => {
    const body = toNdjson([ROW, { ...ROW, id: "row-2" }]);
    const lines = body.split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).id).toBe(ROW.id);
    expect(JSON.parse(lines[1]!).id).toBe("row-2");
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
