// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.

/**
 * Lightweight i18n runtime (no external deps).
 * - Supports 7 locales: en, es, fr, de, ja, pt, zh
 * - ICU-lite placeholder substitution: "Hello, {name}"
 * - Locale negotiation via navigator + localStorage override
 * - Pluralization via Intl.PluralRules
 */

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";

export type Locale = "en" | "es" | "fr" | "de" | "ja" | "pt" | "zh";

export const SUPPORTED_LOCALES: readonly Locale[] = [
  "en",
  "es",
  "fr",
  "de",
  "ja",
  "pt",
  "zh",
] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  pt: "Português",
  zh: "中文",
};

type Dict = Record<string, string>;

const CATALOGS: Record<Locale, Dict> = {
  en: en as Dict,
  es: es as Dict,
  fr: fr as Dict,
  de: de as Dict,
  ja: ja as Dict,
  pt: pt as Dict,
  zh: zh as Dict,
};

const STORAGE_KEY = "sentinel.locale";

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
      return stored as Locale;
    }
  } catch {
    // ignore
  }
  const navLang = typeof navigator !== "undefined" ? navigator.language : "en";
  const base = navLang.split("-")[0]?.toLowerCase() ?? "en";
  if ((SUPPORTED_LOCALES as readonly string[]).includes(base)) {
    return base as Locale;
  }
  return "en";
}

let currentLocale: Locale = detectLocale();
const listeners = new Set<(l: Locale) => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) return;
  currentLocale = locale;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, locale);
      document.documentElement.setAttribute("lang", locale);
    }
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn(locale));
}

export function onLocaleChange(fn: (l: Locale) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const PLACEHOLDER_RE = /\{(\w+)\}/g;

export function t(key: string, params?: Record<string, string | number>): string {
  const catalog = CATALOGS[currentLocale] ?? CATALOGS.en;
  const fallback = CATALOGS.en;
  const template = catalog[key] ?? fallback[key] ?? key;
  if (!params) return template;
  return template.replace(PLACEHOLDER_RE, (_m, name: string) => {
    const v = params[name];
    return v === undefined ? `{${name}}` : String(v);
  });
}

export function plural(
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>>,
): string {
  const rule = new Intl.PluralRules(currentLocale).select(count);
  const template = forms[rule] ?? forms.other ?? "";
  return template.replace(/\{count\}/g, String(count));
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale, opts).format(n);
}

export function formatDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(currentLocale, opts).format(date);
}

export function formatCurrency(minorUnits: number, iso4217: string): string {
  // Monetary values are stored as integer minor units per architecture rules.
  const major = minorUnits / 100;
  return new Intl.NumberFormat(currentLocale, {
    style: "currency",
    currency: iso4217,
  }).format(major);
}
