// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// External-link safety: only http(s) URLs may reach window.open()/<a href>.

import { describe, expect, it } from "vitest";
import { isHttpUrl, isHttpsUrl, safeExternalUrl } from "../url";

describe("isHttpUrl", () => {
  it("accepts http and https absolute URLs", () => {
    expect(isHttpUrl("https://example.com/doc.pdf")).toBe(true);
    expect(isHttpUrl("http://example.com")).toBe(true);
    expect(isHttpUrl("  https://example.com  ")).toBe(true);
  });

  it("rejects dangerous and non-http schemes", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("JavaScript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isHttpUrl("blob:https://example.com/uuid")).toBe(false);
    expect(isHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isHttpUrl("mailto:a@b.com")).toBe(false);
  });

  it("rejects relative, protocol-relative and junk", () => {
    expect(isHttpUrl("/local/path")).toBe(false);
    expect(isHttpUrl("//evil.com")).toBe(false);
    expect(isHttpUrl("DMS-REF-12345")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("   ")).toBe(false);
  });
});

describe("isHttpsUrl", () => {
  it("accepts only https", () => {
    expect(isHttpsUrl("https://example.com")).toBe(true);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("safeExternalUrl", () => {
  it("returns the trimmed URL when safe, else null", () => {
    expect(safeExternalUrl("  https://example.com/x  ")).toBe("https://example.com/x");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
    expect(safeExternalUrl("DMS-REF-1")).toBeNull();
  });
});
