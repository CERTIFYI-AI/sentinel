// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// sessionStore — Zustand store for session-scoped UI state.
// Holds "view as role" impersonation context (CISO/super_admin only).

import { create } from 'zustand'

interface SessionState {
  /** Slug of the role being impersonated, or null for the real session role */
  viewAsRole: string | null
  setViewAsRole: (role: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  viewAsRole: null,
  setViewAsRole: (role) => set({ viewAsRole: role }),
}))
