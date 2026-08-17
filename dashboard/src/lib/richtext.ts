// SPDX-License-Identifier: Apache-2.0
// Rich-text sanitizer for policy content — a strict DOMParser whitelist with
// NO third-party dependency. Policy sections may carry an `html` field
// (authored in RichTextArea); this module is the single trust boundary:
// sanitize on SAVE (what goes to the DB) and again on RENDER (what reaches
// dangerouslySetInnerHTML), so a row written by any other client can never
// inject markup into the dashboard.
//
// Whitelist: p, br, strong, em, ul, ol, li, h3, a. Every attribute is
// stripped except a[href], and href must be an https:// URL (javascript:,
// data:, http:, protocol-relative and everything else is removed). Event
// handlers, style/script/iframe etc. are dropped; unknown tags are unwrapped
// (their text survives, their markup does not).

const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'H3', 'A'])
// Legacy inline tags normalised to their semantic equivalent.
const TAG_ALIASES: Record<string, string> = { B: 'STRONG', I: 'EM' }

function isSafeHref(href: string): boolean {
  return /^https:\/\//i.test(href.trim())
}

function sanitizeNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? '')
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null // comments, CDATA, PIs
  const el = node as Element
  let tag = el.tagName.toUpperCase()
  if (tag in TAG_ALIASES) tag = TAG_ALIASES[tag]

  // script/style/template contents must never survive, not even as text.
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
    return null
  }

  if (!ALLOWED_TAGS.has(tag)) {
    // Unwrap: keep the sanitized children, drop the tag itself.
    const frag = doc.createDocumentFragment()
    el.childNodes.forEach((child) => {
      const clean = sanitizeNode(child, doc)
      if (clean) frag.appendChild(clean)
    })
    return frag
  }

  const out = doc.createElement(tag.toLowerCase())
  // Attributes: everything is dropped except a safe href on <a>.
  if (tag === 'A') {
    const href = el.getAttribute('href') ?? ''
    if (!isSafeHref(href)) {
      // Unsafe link — keep the text, lose the anchor.
      const frag = doc.createDocumentFragment()
      el.childNodes.forEach((child) => {
        const clean = sanitizeNode(child, doc)
        if (clean) frag.appendChild(clean)
      })
      return frag
    }
    out.setAttribute('href', href.trim())
    out.setAttribute('rel', 'noopener noreferrer')
    out.setAttribute('target', '_blank')
  }
  el.childNodes.forEach((child) => {
    const clean = sanitizeNode(child, doc)
    if (clean) out.appendChild(clean)
  })
  return out
}

/** Sanitize an HTML fragment against the strict policy-content whitelist.
 *  Always run this before persisting authored HTML AND before rendering any
 *  stored HTML via dangerouslySetInnerHTML. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const out = doc.implementation.createHTMLDocument('')
  const frag = out.createDocumentFragment()
  doc.body.childNodes.forEach((child) => {
    const clean = sanitizeNode(child, out)
    if (clean) frag.appendChild(clean)
  })
  const container = out.createElement('div')
  container.appendChild(frag)
  return container.innerHTML
}

/** Plain-text projection of an HTML fragment (block tags become newlines).
 *  Used by the version diff, search, and anywhere markup must not leak. */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const lines: string[] = []
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      lines.push(node.textContent ?? '')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = (node as Element).tagName.toUpperCase()
    if (tag === 'SCRIPT' || tag === 'STYLE') return
    if (tag === 'BR') { lines.push('\n'); return }
    const block = ['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL'].includes(tag)
    node.childNodes.forEach(walk)
    if (block) lines.push('\n')
  }
  doc.body.childNodes.forEach(walk)
  return lines.join('').replace(/\n{3,}/g, '\n\n').trim()
}

/** Minimal HTML-escape for legacy plain-text section content. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ---------------------------------------------------------------------------
// Policy content helpers — content jsonb is {summary, sections:[{heading,
// html?, text?, body?}]}. `html` is the rich form; `text`/`body` are legacy
// plain text. All renderers coalesce html ?? text ?? body.
// ---------------------------------------------------------------------------

export interface PolicySection {
  heading: string
  html?: string
  text?: string
  body?: string
}

/** Normalised sections list from any historical content shape. */
export function sectionsOf(content: unknown): PolicySection[] {
  const c = content as { sections?: unknown } | null | undefined
  if (!c || !Array.isArray(c.sections)) return []
  return c.sections.map((s: any) => ({
    heading: s?.heading ?? '',
    html: typeof s?.html === 'string' ? s.html : undefined,
    text: typeof s?.text === 'string' ? s.text : undefined,
    body: typeof s?.body === 'string' ? s.body : undefined,
  }))
}

/** SANITIZED render-ready HTML for one section (legacy text is escaped and
 *  wrapped in paragraphs). Safe for dangerouslySetInnerHTML. */
export function sectionRenderHtml(s: PolicySection): string {
  if (s.html) return sanitizeHtml(s.html)
  const plain = s.text ?? s.body ?? ''
  if (!plain) return ''
  return plain
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/** Plain-text projection of one section's content. */
export function sectionPlainText(s: PolicySection): string {
  if (s.html) return htmlToPlainText(sanitizeHtml(s.html))
  return (s.text ?? s.body ?? '').trim()
}

/** Plain-text projection of a whole content object — the input to the
 *  version line-diff. Stable line structure: summary, then each section as a
 *  heading line followed by its text lines. */
export function contentToPlainText(content: unknown): string {
  const c = content as { summary?: unknown } | null | undefined
  const parts: string[] = []
  if (c && typeof c.summary === 'string' && c.summary.trim()) parts.push(c.summary.trim())
  for (const s of sectionsOf(content)) {
    if (s.heading) parts.push(`## ${s.heading}`)
    const body = sectionPlainText(s)
    if (body) parts.push(body)
  }
  return parts.join('\n')
}
