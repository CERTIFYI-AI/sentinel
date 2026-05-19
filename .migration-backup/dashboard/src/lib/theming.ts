// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * White-label theming via CSS custom properties.
 * Tenants can override brand colors, logo, and accent without a rebuild.
 *
 * Contract: colors are stored in oklch(…) format with chroma <= 0.15 for
 * WCAG AA contrast safety. Accent hue in [0, 360).
 */

import { z } from "zod";

export const TenantThemeSchema = z.object({
  brand_name: z.string().min(1).max(64),
  logo_url: z.string().url().optional(),
  primary_hue: z.number().min(0).max(360),
  primary_chroma: z.number().min(0).max(0.2),
  density: z.enum(["comfortable", "compact"]).default("comfortable"),
  reduce_motion_default: z.boolean().default(false),
});

export type TenantTheme = z.infer<typeof TenantThemeSchema>;

export const DEFAULT_THEME: TenantTheme = {
  brand_name: "Sentinel",
  primary_hue: 262,
  primary_chroma: 0.12,
  density: "comfortable",
  reduce_motion_default: false,
};

export function applyTheme(theme: TenantTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const { primary_hue: h, primary_chroma: c } = theme;
  root.style.setProperty("--brand-primary", `oklch(0.55 ${c} ${h})`);
  root.style.setProperty("--brand-primary-foreground", `oklch(0.98 0.005 ${h})`);
  root.style.setProperty("--brand-accent", `oklch(0.70 ${Math.min(c + 0.02, 0.18)} ${h})`);
  root.setAttribute("data-density", theme.density);
  if (theme.reduce_motion_default) {
    root.setAttribute("data-reduce-motion", "true");
  } else {
    root.removeAttribute("data-reduce-motion");
  }
}

export function parseThemeSafe(input: unknown): TenantTheme {
  const result = TenantThemeSchema.safeParse(input);
  return result.success ? result.data : DEFAULT_THEME;
}
