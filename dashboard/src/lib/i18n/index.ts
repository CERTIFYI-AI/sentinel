// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS7 — i18n skeleton: 7 locales, lazy-loaded, runtime-switchable.
export type Locale = 'en' | 'de' | 'fr' | 'es' | 'ja' | 'zh-CN' | 'pt-BR'

export const SUPPORTED_LOCALES: { code: Locale; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en',    label: 'English',    dir: 'ltr' },
  { code: 'de',    label: 'Deutsch',    dir: 'ltr' },
  { code: 'fr',    label: 'Français',   dir: 'ltr' },
  { code: 'es',    label: 'Español',    dir: 'ltr' },
  { code: 'ja',    label: '日本語',      dir: 'ltr' },
  { code: 'zh-CN', label: '中文（简体）', dir: 'ltr' },
  { code: 'pt-BR', label: 'Português',  dir: 'ltr' },
]

// Lazy-loaded message bundles — each locale in its own chunk.
const loaders: Record<Locale, () => Promise<Record<string, string>>> = {
  'en':    () => import('./locales/en').then(m => m.default),
  'de':    () => import('./locales/de').then(m => m.default),
  'fr':    () => import('./locales/fr').then(m => m.default),
  'es':    () => import('./locales/es').then(m => m.default),
  'ja':    () => import('./locales/ja').then(m => m.default),
  'zh-CN': () => import('./locales/zh-CN').then(m => m.default),
  'pt-BR': () => import('./locales/pt-BR').then(m => m.default),
}

let _locale: Locale = (localStorage.getItem('sentinel_locale') as Locale) ?? 'en'
let _messages: Record<string, string> = {}

export async function loadLocale(locale: Locale): Promise<void> {
  _messages = await loaders[locale]()
  _locale = locale
  localStorage.setItem('sentinel_locale', locale)
  document.documentElement.lang = locale
  const meta = SUPPORTED_LOCALES.find(l => l.code === locale)
  document.documentElement.dir = meta?.dir ?? 'ltr'
}

export function t(key: string, vars?: Record<string, string>): string {
  let msg = _messages[key] ?? key
  if (vars) Object.entries(vars).forEach(([k, v]) => { msg = msg.replace(`{{${k}}}`, v) })
  return msg
}

export function currentLocale(): Locale { return _locale }
