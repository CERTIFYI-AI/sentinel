// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// WS0.10 — a11y smoke via axe-core. Walks the 10 highest-traffic
// routes and asserts zero serious/critical violations. Expand with
// per-page `.spec.ts` files as pages settle post-refactor.

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ROUTES = [
  "/",
  "/risk",
  "/frameworks",
  "/audit-log",
  "/vendors",
  "/incidents",
  "/privacy",
  "/settings",
  "/login",
  "/403",
];

for (const path of ROUTES) {
  test(`a11y: ${path} has no serious/critical violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
