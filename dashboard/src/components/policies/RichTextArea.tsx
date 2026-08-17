// SPDX-License-Identifier: Apache-2.0
// RichTextArea — minimal contenteditable rich-text input for policy sections.
// No third-party editor: a toolbar (bold, italic, H3, bullet/numbered list,
// https link via prompt) over a contenteditable div, controlled through
// value/onChange(html). Everything leaving this component passes through the
// strict whitelist sanitizer (lib/richtext), so only p/br/strong/em/ul/ol/
// li/h3/a[https] can reach the caller — and the incoming value is sanitized
// again before it is ever assigned to innerHTML.
import { useEffect, useRef } from 'react'
import { TextB, TextItalic, TextHOne, ListBullets, ListNumbers, LinkSimple } from '@phosphor-icons/react'
import { sanitizeHtml } from '@/lib/richtext'

export interface RichTextAreaProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Minimum height of the editing surface, px. */
  minHeight?: number
  'aria-label'?: string
}

const TOOLS: { icon: React.ComponentType<{ size?: number }>; label: string; cmd: string; arg?: string }[] = [
  { icon: TextB, label: 'Bold', cmd: 'bold' },
  { icon: TextItalic, label: 'Italic', cmd: 'italic' },
  { icon: TextHOne, label: 'Heading', cmd: 'formatBlock', arg: 'h3' },
  { icon: ListBullets, label: 'Bullet list', cmd: 'insertUnorderedList' },
  { icon: ListNumbers, label: 'Numbered list', cmd: 'insertOrderedList' },
]

export function RichTextArea({ value, onChange, placeholder, minHeight = 110, 'aria-label': ariaLabel }: RichTextAreaProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Track the last html we emitted so a round-tripped `value` prop does not
  // clobber the caret while the user is typing.
  const lastEmitted = useRef<string | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value === lastEmitted.current) return
    const clean = sanitizeHtml(value)
    if (el.innerHTML !== clean) el.innerHTML = clean
  }, [value])

  const emit = () => {
    const el = ref.current
    if (!el) return
    const clean = sanitizeHtml(el.innerHTML)
    lastEmitted.current = clean
    onChange(clean)
  }

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus()
    // execCommand is deprecated but has no dependency-free replacement for
    // contenteditable formatting; the sanitizer guarantees the output shape.
    document.execCommand(cmd, false, arg)
    emit()
  }

  const insertLink = () => {
    const url = window.prompt('Link URL (must start with https://)')
    if (!url) return
    if (!/^https:\/\//i.test(url.trim())) {
      window.alert('Only https:// links are allowed in policy content.')
      return
    }
    ref.current?.focus()
    document.execCommand('createLink', false, url.trim())
    emit()
  }

  const empty = !value || value === '<p></p>' || value === '<br>'

  return (
    <div style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-surface))' }}>
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex items-center gap-0.5 px-1 py-0.5"
        style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--bg-muted))' }}
      >
        {TOOLS.map(({ icon: Icon, label, cmd, arg }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault() /* keep the selection */}
            onClick={() => exec(cmd, arg)}
            className="p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-surface))]"
            style={{ color: 'hsl(var(--text-2))', borderRadius: 0 }}
          >
            <Icon size={14} />
          </button>
        ))}
        <button
          type="button"
          title="Insert link (https only)"
          aria-label="Insert link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--brand))] hover:bg-[hsl(var(--bg-surface))]"
          style={{ color: 'hsl(var(--text-2))', borderRadius: 0 }}
        >
          <LinkSimple size={14} />
        </button>
      </div>
      <div className="relative">
        {empty && placeholder && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-2 text-sm"
            style={{ color: 'hsl(var(--text-4))' }}
          >
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel ?? 'Rich text'}
          onInput={emit}
          onBlur={emit}
          className="rich-text-surface px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand))] [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:underline [&_a]:text-[hsl(var(--brand))] [&_p]:my-1"
          style={{ minHeight, color: 'hsl(var(--text-1))', lineHeight: 1.6 }}
        />
      </div>
    </div>
  )
}

export default RichTextArea
