// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.

import { describe, it, expect } from "vitest";
import {
  listFrameworks,
  getFramework,
  frameworksByDomain,
  FRAMEWORK_COUNT,
  TOTAL_CONTROL_COUNT,
} from "@/lib/frameworks";

describe("frameworks catalog", () => {
  it("loads at least 20 frameworks", () => {
    expect(FRAMEWORK_COUNT).toBeGreaterThanOrEqual(20);
    expect(listFrameworks().length).toBe(FRAMEWORK_COUNT);
  });

  it("all frameworks have an authoritative source URL", () => {
    for (const f of listFrameworks()) {
      expect(f.url.startsWith("https://")).toBe(true);
      expect(f.authority.length).toBeGreaterThan(0);
    }
  });

  it("every id is unique", () => {
    const ids = listFrameworks().map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getFramework returns by id", () => {
    expect(getFramework("gdpr")?.name).toMatch(/General Data Protection/);
    expect(getFramework("does-not-exist")).toBeUndefined();
  });

  it("frameworksByDomain filters", () => {
    const privacy = frameworksByDomain("privacy");
    expect(privacy.length).toBeGreaterThan(0);
    expect(privacy.every((f) => f.domain === "privacy")).toBe(true);
  });

  it("seed control count is reported", () => {
    expect(TOTAL_CONTROL_COUNT).toBeGreaterThanOrEqual(80);
  });
});
