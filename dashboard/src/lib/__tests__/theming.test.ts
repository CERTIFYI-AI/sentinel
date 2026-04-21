// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect } from "vitest";
import { DEFAULT_THEME, TenantThemeSchema, parseThemeSafe } from "../theming";

describe("theming", () => {
  it("validates a well-formed theme", () => {
    const parsed = TenantThemeSchema.parse({
      brand_name: "Acme",
      primary_hue: 120,
      primary_chroma: 0.1,
      density: "compact",
      reduce_motion_default: true,
    });
    expect(parsed.brand_name).toBe("Acme");
  });

  it("rejects out-of-range hue", () => {
    expect(() =>
      TenantThemeSchema.parse({
        brand_name: "Acme",
        primary_hue: 999,
        primary_chroma: 0.1,
      }),
    ).toThrow();
  });

  it("falls back to default on invalid input", () => {
    expect(parseThemeSafe({ brand_name: "" })).toEqual(DEFAULT_THEME);
    expect(parseThemeSafe(null)).toEqual(DEFAULT_THEME);
  });
});
