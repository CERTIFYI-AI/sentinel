// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// onboardingStore — persists ONLY the user's "don't show this again" choice for
// the Overview setup card. It deliberately stores no step state: whether a step
// is done is always DERIVED from the real tables by useSetupProgress, never
// remembered here. All this remembers is a UI preference, so a dismissed card
// never masquerades as a completed setup.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  /** True once the user chooses "Don't show this again" on the Overview card. */
  setupCardDismissed: boolean
  dismissSetupCard: () => void
  /** Escape hatch (e.g. a Settings toggle) to bring the card back. */
  resetSetupCard: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      setupCardDismissed: false,
      dismissSetupCard: () => set({ setupCardDismissed: true }),
      resetSetupCard: () => set({ setupCardDismissed: false }),
    }),
    { name: 'sentinel-onboarding' },
  ),
)
