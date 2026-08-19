// SPDX-License-Identifier: Apache-2.0
// External-link safety. User-supplied URLs (e.g. a model document reference)
// must never reach window.open() or an <a href> unchecked: a `javascript:` URL
// executes in the opened window's context, and `data:`/`blob:` URLs enable
// phishing and content-spoofing. The single rule here — only http(s), and we
// prefer https — is applied on SAVE (reject bad input) and again on OPEN.

/**
 * True when `raw` parses to an absolute http: or https: URL.
 * Everything else — javascript:, data:, blob:, vbscript:, mailto:,
 * protocol-relative, relative paths, and unparseable junk — is rejected.
 */
export function isHttpUrl(raw: string): boolean {
  if (typeof raw !== 'string') return false
  const s = raw.trim()
  if (!s) return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Stricter variant: only https:. */
export function isHttpsUrl(raw: string): boolean {
  if (typeof raw !== 'string') return false
  try {
    return new URL(raw.trim()).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Returns the trimmed URL when it is a safe http(s) link, otherwise null.
 * Callers use the null to refuse the navigation and surface an error rather
 * than silently opening something dangerous.
 */
export function safeExternalUrl(raw: string): string | null {
  const s = typeof raw === 'string' ? raw.trim() : ''
  return isHttpUrl(s) ? s : null
}
