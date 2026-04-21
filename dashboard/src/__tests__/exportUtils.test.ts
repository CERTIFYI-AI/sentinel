// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// F.1 — Unit tests for src/lib/exportUtils.ts
// Covers: CSV header row, body rows, RFC-4180 quoting (commas, quotes, newlines),
// empty-array edge case, and JSON export shape.
//
// Strategy: jsdom supplies document.createElement. We stub
// URL.createObjectURL / URL.revokeObjectURL to avoid the
// "not implemented" jsdom error. The Blob content is captured
// via a FileReader so we can assert the generated CSV text.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportCsv, exportJson } from "@/lib/exportUtils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode the first Blob passed to URL.createObjectURL as a UTF-8 string. */
async function captureBlob(): Promise<string> {
  const calls = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls;
  const blob: Blob = calls[calls.length - 1][0] as Blob;
  return blob.text();
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
let anchorClickSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Stub URL helpers that jsdom does not implement
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
  vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);

  // Stub the anchor click so no navigation occurs
  anchorClickSpy = vi.fn();
  vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
    const el = document.createElementNS("http://www.w3.org/1999/xhtml", tag) as HTMLElement;
    if (tag === "a") {
      el.click = anchorClickSpy;
    }
    return el;
  });

  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// CSV — header row
// ---------------------------------------------------------------------------
describe("exportCsv — header row", () => {
  it("produces a header row from the object keys of the first row", async () => {
    exportCsv([{ id: "1", name: "Alpha", score: 10 }], "test.csv");
    const csv = await captureBlob();
    const lines = csv.split("\n");
    expect(lines[0]).toBe("id,name,score");
  });

  it("triggers an anchor click (initiates a download)", () => {
    exportCsv([{ id: "1" }], "test.csv");
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// CSV — body rows
// ---------------------------------------------------------------------------
describe("exportCsv — body rows", () => {
  it("writes each record as a data row after the header", async () => {
    exportCsv(
      [
        { id: "1", status: "OPEN" },
        { id: "2", status: "CLOSED" },
      ],
      "out.csv",
    );
    const csv = await captureBlob();
    const lines = csv.split("\n");
    expect(lines).toHaveLength(3); // header + 2 data rows
    expect(lines[1]).toBe("1,OPEN");
    expect(lines[2]).toBe("2,CLOSED");
  });

  it("converts null and undefined values to empty strings", async () => {
    exportCsv(
      [{ id: "1", note: null as unknown as string, ref: undefined as unknown as string }],
      "out.csv",
    );
    const csv = await captureBlob();
    const lines = csv.split("\n");
    // header: id,note,ref  |  data: 1,,
    expect(lines[1]).toBe("1,,");
  });
});

// ---------------------------------------------------------------------------
// CSV — RFC-4180 quoting
// ---------------------------------------------------------------------------
describe("exportCsv — RFC-4180 quoting", () => {
  it("wraps a value in double-quotes when it contains a comma", async () => {
    exportCsv([{ name: "Smith, John", age: "30" }], "q.csv");
    const csv = await captureBlob();
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toContain('"Smith, John"');
  });

  it("escapes embedded double-quotes by doubling them (RFC-4180)", async () => {
    exportCsv([{ desc: 'He said "hello"' }], "q.csv");
    const csv = await captureBlob();
    const dataLine = csv.split("\n")[1];
    // Embedded " → "" and the whole field is quoted
    expect(dataLine).toBe('"He said ""hello"""');
  });

  it("wraps a value in double-quotes when it contains a newline", async () => {
    exportCsv([{ text: "line1\nline2" }], "q.csv");
    const csv = await captureBlob();
    // When we split on \n we'll see the quoted field with embedded newline
    expect(csv).toContain('"line1\nline2"');
  });

  it("does not quote plain values that need no escaping", async () => {
    exportCsv([{ id: "abc123", count: "42" }], "q.csv");
    const csv = await captureBlob();
    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe("abc123,42");
  });
});

// ---------------------------------------------------------------------------
// CSV — empty array
// ---------------------------------------------------------------------------
describe("exportCsv — empty array", () => {
  it("returns without creating a download when the rows array is empty", () => {
    exportCsv([], "empty.csv");
    // createObjectURL should NOT have been called
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// JSON export
// ---------------------------------------------------------------------------
describe("exportJson", () => {
  it("creates a Blob containing pretty-printed JSON", async () => {
    exportJson([{ id: "1", value: 99 }], "data.json");
    const blobText = await captureBlob();
    const parsed = JSON.parse(blobText) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it("triggers an anchor click to initiate download", () => {
    exportJson([{ x: 1 }], "data.json");
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  });

  it("schedules URL revocation after 1 s via setTimeout", () => {
    exportJson([{ x: 1 }], "data.json");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1001);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });
});
