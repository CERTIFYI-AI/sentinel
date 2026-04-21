// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
//
// WS0.5 — Baseline smoke suite. Validates that:
//   1. The app boots at / without console-level runtime errors.
//   2. Protected routes enforce the auth guard by redirecting to /login
//      (or exposing a login-required affordance) when unauthenticated.
//   3. Login screen renders core accessible landmarks.
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
