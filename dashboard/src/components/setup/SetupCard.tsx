// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// SetupCard — the dismissible "Get started" card on /overview. It appears ONLY
// while overall setup is incomplete (at least one not-started step), and never
// for a fully set-up org. "Don't show this again" persists via onboardingStore.
//
// Like the panel, every step's state here is DERIVED from real data — the card
// summarises overall progress and surfaces the next few not-started steps,
// deep-linking each to where it is done. It renders nothing (a) while loading,
// (b) if dismissed, (c) on error, or (d) once there is no remaining work — so it
// is quiet by construction and never nags a configured org.

import { Link } from 'react-router-dom'
import { Rocket, ArrowRight, X } from '@phosphor-icons/react'
import { useSetupProgress } from '@/hooks/useSetupProgress'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { allStepsDeduped, overallProgress, stepState } from '@/data/setupChecklists'

export function SetupCard() {
  const { data: ctx, isLoading, isError } = useSetupProgress()
  const dismissed = useOnboardingStore((s) => s.setupCardDismissed)
  const dismiss = useOnboardingStore((s) => s.dismissSetupCard)

  // Quiet by construction: no card while loading, once dismissed, on error, or
  // when there is genuinely nothing left to start.
  if (isLoading || isError || !ctx || dismissed) return null

  const progress = overallProgress(ctx)
  if (progress.todo === 0) return null

  const nextSteps = allStepsDeduped()
    .filter((s) => stepState(s, ctx) === 'todo')
    .slice(0, 3)

  const unknownNote = progress.unknown > 0 ? ` · ${progress.unknown} could not be checked` : ''

  return (
    <div
      style={{
        border: '1px solid hsl(var(--border))',
        borderLeft: '3px solid hsl(var(--brand))',
        background: 'hsl(var(--bg-surface))',
        padding: '16px 18px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            background: 'hsl(var(--brand-subtle))',
            color: 'hsl(var(--brand))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Rocket size={18} weight="duotone" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-1))' }}>Finish setting up Sentinel</h2>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Don't show this again"
              title="Don't show this again"
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 24,
                height: 24,
                color: 'hsl(var(--text-4))',
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
              }}
            >
              <X size={14} weight="bold" />
            </button>
          </div>
          <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginTop: 3, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {progress.done} of {progress.total} steps complete{unknownNote}
          </p>

          <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {nextSteps.map((step) => (
              <li key={step.id}>
                <Link
                  to={step.actionTo}
                  className="setup-step-action"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '9px 11px',
                    background: 'hsl(var(--bg-raised))',
                    border: '1px solid hsl(var(--border))',
                    textDecoration: 'none',
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-1))' }}>{step.title}</span>
                    <span style={{ display: 'block', fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 1 }}>{step.actionLabel}</span>
                  </span>
                  <ArrowRight size={13} weight="bold" style={{ color: 'hsl(var(--brand))', flexShrink: 0 }} />
                </Link>
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
            <button
              type="button"
              onClick={dismiss}
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'hsl(var(--text-4))',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Don't show this again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SetupCard
