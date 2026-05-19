// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// N-08 — Global Cmd-K / Ctrl-K + '/' + '?' keyboard bindings.
import { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

export function useCommandPalette() {
  const { setCommandPaletteOpen, setShortcutsModalOpen } = useUIStore()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd-K / Ctrl-K → open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
        return
      }
      // '?' → shortcuts modal (not in input)
      if (e.key === '?' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setShortcutsModalOpen(true)
        return
      }
      // Escape → close both
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
        setShortcutsModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen, setShortcutsModalOpen])
}
