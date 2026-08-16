// SPDX-License-Identifier: Apache-2.0
// Sanitizer contract tests — the whitelist in lib/richtext is the trust
// boundary between stored policy HTML and dangerouslySetInnerHTML. These
// tests pin the two sides of the contract: hostile markup is stripped,
// allowed markup survives unchanged.
import { describe, it, expect } from 'vitest'
import {
  sanitizeHtml, htmlToPlainText, escapeHtml,
  sectionRenderHtml, sectionPlainText, contentToPlainText, sectionsOf,
} from '../richtext'
import { diffLines, diffStats } from '../lineDiff'

describe('sanitizeHtml — hostile input', () => {
  it('strips <script> tags including their contents', () => {
    expect(sanitizeHtml('<p>hi</p><script>alert(1)</script>')).toBe('<p>hi</p>')
  })

  it('strips <style>, <iframe>, <object>, <embed> entirely', () => {
    expect(sanitizeHtml('<style>p{color:red}</style><p>x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<iframe src="https://evil.example"></iframe>ok')).toBe('ok')
    expect(sanitizeHtml('<object data="x"></object><embed src="x">safe')).toBe('safe')
  })

  it('strips event-handler attributes', () => {
    const out = sanitizeHtml('<p onclick="alert(1)" onmouseover="x()">text</p>')
    expect(out).toBe('<p>text</p>')
    expect(out).not.toContain('onclick')
  })

  it('strips style and class attributes from allowed tags', () => {
    expect(sanitizeHtml('<strong style="position:fixed" class="x">b</strong>')).toBe('<strong>b</strong>')
  })

  it('removes javascript: links but keeps the link text', () => {
    // eslint-disable-next-line no-script-url
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>')
    expect(out).toBe('click')
    expect(out).not.toContain('javascript')
  })

  it('removes data:, http:, and protocol-relative links', () => {
    expect(sanitizeHtml('<a href="data:text/html,x">d</a>')).toBe('d')
    expect(sanitizeHtml('<a href="http://plain.example">h</a>')).toBe('h')
    expect(sanitizeHtml('<a href="//evil.example">pr</a>')).toBe('pr')
  })

  it('unwraps unknown tags but keeps their text', () => {
    expect(sanitizeHtml('<div><span>keep me</span></div>')).toBe('keep me')
    expect(sanitizeHtml('<table><tr><td>cell</td></tr></table>')).toContain('cell')
  })

  it('drops img/svg vectors', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)>text')).toBe('text')
    expect(sanitizeHtml('<svg onload=alert(1)><circle/></svg>ok')).toBe('ok')
  })

  it('survives nested hostile payloads inside allowed tags', () => {
    const out = sanitizeHtml('<ul><li>a<script>bad()</script></li><li onclick="x">b</li></ul>')
    expect(out).toBe('<ul><li>a</li><li>b</li></ul>')
  })

  it('handles empty / null input', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
  })
})

describe('sanitizeHtml — allowed markup survives', () => {
  it('keeps the whitelist tags', () => {
    const html = '<h3>Scope</h3><p>All <strong>staff</strong> and <em>vendors</em>.</p><ul><li>one</li><li>two</li></ul><ol><li>a</li></ol><p>line<br>break</p>'
    expect(sanitizeHtml(html)).toBe(html)
  })

  it('keeps https links, forcing rel/target hardening', () => {
    const out = sanitizeHtml('<a href="https://example.com/policy">policy</a>')
    expect(out).toContain('href="https://example.com/policy"')
    expect(out).toContain('rel="noopener noreferrer"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('>policy</a>')
  })

  it('normalises b/i to strong/em', () => {
    expect(sanitizeHtml('<b>x</b><i>y</i>')).toBe('<strong>x</strong><em>y</em>')
  })

  it('is idempotent — sanitizing twice changes nothing', () => {
    const once = sanitizeHtml('<p>a <strong>b</strong> <a href="https://x.example">c</a></p><div>d</div>')
    expect(sanitizeHtml(once)).toBe(once)
  })
})

describe('plain-text projections', () => {
  it('htmlToPlainText flattens block structure to lines', () => {
    expect(htmlToPlainText('<p>one</p><p>two</p>')).toBe('one\ntwo')
    expect(htmlToPlainText('<ul><li>a</li><li>b</li></ul>')).toContain('a\nb')
  })

  it('escapeHtml escapes the dangerous characters', () => {
    expect(escapeHtml('<b>&"')).toBe('&lt;b&gt;&amp;&quot;')
  })

  it('sectionRenderHtml escapes legacy plain text into paragraphs', () => {
    const out = sectionRenderHtml({ heading: 'h', text: 'a <script> b\n\nnext' })
    expect(out).not.toContain('<script>')
    expect(out).toContain('&lt;script&gt;')
    expect(out.startsWith('<p>')).toBe(true)
  })

  it('sectionRenderHtml sanitizes stored html before render', () => {
    const out = sectionRenderHtml({ heading: 'h', html: '<p onclick="x()">hi</p><script>bad</script>' })
    expect(out).toBe('<p>hi</p>')
  })

  it('section helpers coalesce html ?? text ?? body', () => {
    expect(sectionPlainText({ heading: 'h', body: 'legacy body' })).toBe('legacy body')
    expect(sectionPlainText({ heading: 'h', text: 'legacy text' })).toBe('legacy text')
    expect(sectionPlainText({ heading: 'h', html: '<p>rich</p>', text: 'ignored' })).toBe('rich')
  })

  it('contentToPlainText projects summary + sections and sectionsOf tolerates junk', () => {
    const content = { summary: 'Sum', sections: [{ heading: 'Scope', body: 'Everyone' }] }
    expect(contentToPlainText(content)).toBe('Sum\n## Scope\nEveryone')
    expect(sectionsOf(null)).toEqual([])
    expect(sectionsOf({ sections: 'nope' })).toEqual([])
  })
})

describe('lineDiff', () => {
  it('reports identical inputs as all-same', () => {
    const d = diffLines('a\nb', 'a\nb')
    expect(d.every(l => l.type === 'same')).toBe(true)
  })

  it('detects added and removed lines', () => {
    const d = diffLines('a\nb\nc', 'a\nx\nc')
    expect(d).toEqual([
      { type: 'same', text: 'a' },
      { type: 'removed', text: 'b' },
      { type: 'added', text: 'x' },
      { type: 'same', text: 'c' },
    ])
    expect(diffStats(d)).toEqual({ added: 1, removed: 1 })
  })

  it('handles empty sides', () => {
    expect(diffLines('', 'a')).toEqual([{ type: 'added', text: 'a' }])
    expect(diffLines('a', '')).toEqual([{ type: 'removed', text: 'a' }])
    expect(diffLines('', '')).toEqual([])
  })
})
