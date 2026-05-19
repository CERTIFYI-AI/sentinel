// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS0.5 — Baseline smoke suite. Validates that:
//   1. The app boots at / without console-level runtime errors.
//   2. Protected routes enforce the auth guard by redirecting to /login
//      (or exposing a login-required affordance) when unauthenticated.
//   3. Login screen renders core accessible landmarks.
//
// F.2 additions — additional smoke checks:
//   4. Page title contains "Sentinel".
//   5. A main navigation element is present after boot.
//   6. No console errors of type "error" on initial load.
//   7. /risk-register renders (not blank).
//   8. /risk/incidents renders (not blank).
//
// Protected-route coverage will grow as new pages ship in WS2.

import { expect, test } from "@playwright/test";

const PROTECTED_ROUTES = [
  "/audit-log/chain",
  "/evidence/custody/00000000-0000-0000-0000-000000000000",
  "/settings/sso",
];

test.describe("@smoke app shell", () => {
  test("home page boots without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await expect(page).toHaveURL(/\/(login|dashboard|overview|$)/);
    expect(errors).toEqual([]);
  });

  test("login page exposes accessible landmarks", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("main, [role=main]").first()).toBeVisible();
  });
});

test.describe("@smoke auth guard", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated ${route} does not expose privileged UI`, async ({ page }) => {
      await page.goto(route);
      // Either redirected to /login, or page renders a login/redirect affordance.
      const url = page.url();
      const onLogin = /\/login/.test(url);
      const hasLoginAffordance = await page
        .getByRole("link", { name: /log ?in|sign ?in/i })
        .first()
        .isVisible()
        .catch(() => false);
      expect(onLogin || hasLoginAffordance).toBeTruthy();
    });
  }
});

// ---------------------------------------------------------------------------
// F.2 — Extended smoke checks
// ---------------------------------------------------------------------------

test.describe("@smoke F.2 sentinel-specific checks", () => {
  test("page title contains 'Sentinel'", async ({ page }) => {
    await page.goto("/");
    // The title may be on the login redirect, dashboard, or the root shell.
    await expect(page).toHaveTitle(/sentinel/i);
  });

  test("a main navigation element is present", async ({ page }) => {
    await page.goto("/");
    // After boot (possibly at /login) a nav or sidebar landmark must exist.
    // Accept either a <nav> element, role=navigation, or role=complementary sidebar.
    const navLocator = page.locator(
      "[role=navigation], nav, aside[role=complementary], [data-testid=sidebar]",
    );
    await expect(navLocator.first()).toBeVisible({ timeout: 10_000 });
  });

  test("no console errors on initial load", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    await page.goto("/");
    // Allow a brief settle period for any deferred scripts
    await page.waitForTimeout(500);
    expect(consoleErrors).toEqual([]);
  });

  test("/risk-register route renders a non-blank page", async ({ page }) => {
    await page.goto("/risk-register");
    // Auth guard may redirect to /login — either way the page must render content.
    const url = page.url();
    if (/\/login/.test(url)) {
      // Redirected to login — login page rendered, not blank
      await expect(page.locator("main, [role=main], form").first()).toBeVisible();
    } else {
      // Authenticated view — expect at least a heading or table landmark
      await expect(
        page
          .locator(
            "h1, h2, [role=table], [role=grid], table, [data-testid=risk-register]",
          )
          .first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  });

  test("/risk/incidents route renders a non-blank page", async ({ page }) => {
    await page.goto("/risk/incidents");
    const url = page.url();
    if (/\/login/.test(url)) {
      await expect(page.locator("main, [role=main], form").first()).toBeVisible();
    } else {
      await expect(
        page
          .locator(
            "h1, h2, [role=table], [role=grid], table, [data-testid=incidents]",
          )
          .first(),
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
