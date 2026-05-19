// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

import { describe, it, expect, beforeEach } from "vitest";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  t,
  setLocale,
  plural,
  formatNumber,
  formatCurrency,
} from "../index";

describe("i18n", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("supports all 7 required locales", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(7);
    expect(SUPPORTED_LOCALES).toEqual(["en", "es", "fr", "de", "ja", "pt", "zh"]);
    for (const l of SUPPORTED_LOCALES) {
      expect(LOCALE_LABELS[l]).toBeTruthy();
    }
  });

  it("translates keys across locales", () => {
    setLocale("en");
    expect(t("action.save")).toBe("Save");
    setLocale("fr");
    expect(t("action.save")).toBe("Enregistrer");
    setLocale("ja");
    expect(t("action.save")).toBe("保存");
  });

  it("falls back to English for missing keys", () => {
    setLocale("zh");
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("substitutes named placeholders", () => {
    setLocale("en");
    expect(t("unit.count.other", { count: 42 })).toBe("42 items");
  });

  it("applies ICU plural rules", () => {
    setLocale("en");
    expect(plural(0, { zero: "Zero", one: "One", other: "{count} other" })).toBe(
      "0 other",
    );
    expect(plural(1, { zero: "Zero", one: "One", other: "{count} other" })).toBe("One");
    expect(plural(5, { one: "One", other: "{count} others" })).toBe("5 others");
  });

  it("formats numbers per locale", () => {
    setLocale("en");
    expect(formatNumber(1234567.89)).toContain("1,234,567");
    setLocale("de");
    // German uses . for thousands
    expect(formatNumber(1234567.89)).toContain("1.234.567");
  });

  it("formats currency from minor units", () => {
    setLocale("en");
    // 12345 cents = $123.45
    const out = formatCurrency(12345, "USD");
    expect(out).toContain("123.45");
  });
});
