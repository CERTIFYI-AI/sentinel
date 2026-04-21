// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import { SUPPORTED_LOCALES } from '../i18n'

describe('i18n', () => {
  it('exports 7 supported locales', () => {
    expect(SUPPORTED_LOCALES).toHaveLength(7)
  })
  it('all locales have code, label, dir', () => {
    for (const loc of SUPPORTED_LOCALES) {
      expect(loc.code).toBeTruthy()
      expect(loc.label).toBeTruthy()
      expect(['ltr', 'rtl']).toContain(loc.dir)
    }
  })
  it('includes en, de, fr, es, ja, zh-CN, pt-BR', () => {
    const codes = SUPPORTED_LOCALES.map(l => l.code)
    expect(codes).toContain('en')
    expect(codes).toContain('de')
    expect(codes).toContain('fr')
    expect(codes).toContain('es')
    expect(codes).toContain('ja')
    expect(codes).toContain('zh-CN')
    expect(codes).toContain('pt-BR')
  })
})
