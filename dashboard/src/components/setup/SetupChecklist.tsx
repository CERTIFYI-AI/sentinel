// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// SetupChecklist — the guided-setup panel. Renders one module group (or the
// whole platform) as an ordered list of governance-meaningful steps, each
// carrying its DERIVED state: done, not started, or "Unknown" when the source
// could not be checked. Every step deep-links to the exact place to do it.
//
// The three states are visually distinct and none is ever conflated: "Unknown"
// is neither a green tick nor an empty circle — it is its own neutral marker, so
// a failed query is never mistaken for done or for not-done (CLAUDE.md UI/UX
// gate: null renders honestly, never as 0/green).
//
// Steps are never blocking and always skippable — this is guidance, not a
// wizard that traps you. Uses platform primitives (EmptyState, ErrorState) and
// semantic tokens only; the loading skeleton respects prefers-reduced-motion.

import { Link } from 'react-router-dom'
import { CheckCircle, Circle, Question, ArrowRight, CaretRight, Rocket } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { useSetupProgress } from '@/hooks/useSetupProgress'
import {
  SETUP_GROUPS,
  groupProgress,
  stepState,
  type SetupGroup,
  type SetupStep,
  type SetupContext,
  type StepState,
} from '@/data/setupChecklists'

interface SetupChecklistProps {
  /** Render only this group; when omitted, every group is shown. */
  groupId?: string
  /** Called when the user activates a step link (e.g. to close a drawer). */
  onNavigate?: () => void
}

// ── state → presentation ─────────────────────────────────────────────────────

function StepIcon({ state }: { state: StepState }) {
  if (state === 'done') {
    return <CheckCircle size={18} weight="fill" style={{ color: 'hsl(var(--s-ok-tx))', flexShrink: 0 }} aria-hidden />
  }
  if (state === 'unknown') {
    return <Question size={18} weight="bold" style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} aria-hidden />
  }
  return <Circle size={18} style={{ color: 'hsl(var(--text-4))', flexShrink: 0 }} aria-hidden />
}

const STATE_LABEL: Record<StepState, string> = {
  done: 'Done',
  todo: 'Not started',
  unknown: 'Unknown',
}

function stateChipStyle(state: StepState): React.CSSProperties {
  if (state === 'done') {
    return { background: 'hsl(var(--s-ok-bg))', color: 'hsl(var(--s-ok-tx))', border: '1px solid hsl(var(--s-ok-br))' }
  }
  if (state === 'unknown') {
    return { background: 'hsl(var(--bg-muted))', color: 'hsl(var(--text-3))', border: '1px dashed hsl(var(--border))' }
  }
  return { background: 'hsl(var(--bg-raised))', color: 'hsl(var(--text-3))', border: '1px solid hsl(var(--border))' }
}

/** "4 of 7 steps complete", or "… — 1 could not be checked" when any Unknown. */
function progressLine(done: number, total: number, unknown: number): string {
  const base = `${done} of ${total} step${total === 1 ? '' : 's'} complete`
  if (unknown > 0) return `${base} — ${unknown} could not be checked`
  return base
}

// ── step row ─────────────────────────────────────────────────────────────────

function StepRow({ step, ctx, onNavigate }: { step: SetupStep; ctx: SetupContext; onNavigate?: () => void }) {
  const state = stepState(step, ctx)
  const detail = step.detail?.(ctx) ?? null

  return (
    <li
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 14px',
        background: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border))',
        borderLeft: state === 'done' ? '3px solid hsl(var(--s-ok-tx))' : '3px solid hsl(var(--border))',
      }}
    >
      <div style={{ paddingTop: 2 }}>
        <StepIcon state={state} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-1))', lineHeight: 1.35 }}>{step.title}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              ...stateChipStyle(state),
            }}
          >
            {STATE_LABEL[state]}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', lineHeight: 1.45, marginTop: 4 }}>{step.why}</p>
        {detail && (
          <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{detail}</p>
        )}
        <Link
          to={step.actionTo}
          onClick={onNavigate}
          className="setup-step-action"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            marginTop: 8,
            fontSize: 12,
            fontWeight: 600,
            color: 'hsl(var(--brand))',
            textDecoration: 'none',
          }}
        >
          {state === 'done' ? 'Review' : step.actionLabel}
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>
    </li>
  )
}

// ── group block ──────────────────────────────────────────────────────────────

function GroupBlock({ group, ctx, onNavigate }: { group: SetupGroup; ctx: SetupContext; onNavigate?: () => void }) {
  const p = groupProgress(group, ctx)
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'hsl(var(--text-1))' }}>{group.title}</h3>
        <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', marginTop: 2, lineHeight: 1.4 }}>{group.description}</p>
        <p style={{ fontSize: 11, color: 'hsl(var(--text-4))', marginTop: 6, fontWeight: 600 }}>
          {progressLine(p.done, p.total, p.unknown)}
        </p>
      </div>
      <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0 }}>
        {group.steps.map((s) => (
          <StepRow key={s.id} step={s} ctx={ctx} onNavigate={onNavigate} />
        ))}
      </ol>
    </section>
  )
}

// ── skeleton (reduced-motion aware) ──────────────────────────────────────────

function ChecklistSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading setup progress" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{`
        @keyframes setupSkeletonPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.55 } }
        .setup-skel { animation: setupSkeletonPulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .setup-skel { animation: none; } }
      `}</style>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="setup-skel"
          style={{ height: 74, background: 'hsl(var(--bg-raised))', border: '1px solid hsl(var(--border))' }}
        />
      ))}
    </div>
  )
}

// ── panel ────────────────────────────────────────────────────────────────────

export function SetupChecklist({ groupId, onNavigate }: SetupChecklistProps) {
  const { data: ctx, isLoading, isError, error, refetch } = useSetupProgress()

  if (isLoading) return <ChecklistSkeleton />
  if (isError || !ctx) {
    return (
      <ErrorState
        title="Could not load setup progress"
        error={error}
        onRetry={() => void refetch()}
      />
    )
  }

  const groups = groupId ? SETUP_GROUPS.filter((g) => g.id === groupId) : SETUP_GROUPS

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<Rocket size={22} weight="duotone" />}
        title="No setup steps for this area"
        description="Browse the full checklist to see what to set up next across the platform."
      />
    )
  }

  return (
    <div>
      {!groupId && (
        <p style={{ fontSize: 12, color: 'hsl(var(--text-3))', lineHeight: 1.5, marginBottom: 16 }}>
          Each step below knows whether it is done because it checks the real data — not because you clicked through it.
          Steps are guidance, never blocking: skip any of them and come back later.
        </p>
      )}
      {groups.map((g) => (
        <GroupBlock key={g.id} group={g} ctx={ctx} onNavigate={onNavigate} />
      ))}
      {groupId && (
        <Link
          to="/overview"
          onClick={onNavigate}
          className="setup-step-action"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: 'hsl(var(--text-3))',
            textDecoration: 'none',
          }}
        >
          See the full setup checklist
          <CaretRight size={12} weight="bold" />
        </Link>
      )}
    </div>
  )
}

export default SetupChecklist
