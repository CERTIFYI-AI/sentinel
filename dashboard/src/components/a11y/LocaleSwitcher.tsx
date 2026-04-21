// @ts-nocheck
// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// WS7 — Locale switcher component. Lazy-loads translation bundles.
import { useState } from 'react'
import { SUPPORTED_LOCALES, loadLocale, currentLocale, type Locale } from '../../lib/i18n'

export function LocaleSwitcher() {
  const [locale, setLocale] = useState<Locale>(currentLocale())
  const [loading, setLoading] = useState(false)

  async function handleChange(code: Locale) {
    setLoading(true)
    await loadLocale(code)
    setLocale(code)
    setLoading(false)
  }

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={e => handleChange(e.target.value as Locale)}
        disabled={loading}
        aria-label="Select interface language"
        className="text-xs bg-transparent border border-zinc-200 rounded px-2 py-1 text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#368F4D] cursor-pointer"
      >
        {SUPPORTED_LOCALES.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}
