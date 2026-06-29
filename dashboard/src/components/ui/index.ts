// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
// Canonical shared component library — Phase 5 enterprise polish

// ── Primitives ────────────────────────────────────────────────────────────────
export { Badge } from './badge';
export { SentinelButton, Btn } from './SentinelButton';
export { SentinelInput } from './SentinelInput';

// ── Layout + Page chrome ──────────────────────────────────────────────────────
export { PageHeader } from './PageHeader';
export type { PageHeaderProps, BreadcrumbItem, PageHeaderAction } from './PageHeader';

export { StatCardRow } from './StatCardRow';
export type { StatCardRowProps, StatCardRowItem } from './StatCardRow';

export { StatCard } from './StatCard';
export { FilterBar } from './FilterBar';
export type { FilterBarProps, FilterField, FilterOption } from './FilterBar';

// ── Data display ──────────────────────────────────────────────────────────────
export { default as DataTable } from './DataTable';
export { EmptyState } from './EmptyState';
export { default as ErrorState } from './ErrorState';
export { PageSkeleton } from './PageSkeleton';
export { EtlHealthDot } from './EtlHealthDot';

// ── Overlays ──────────────────────────────────────────────────────────────────
export { ConfirmDialog } from './ConfirmDialog';
export { DetailDrawer } from './DetailDrawer';
export type { DetailDrawerProps, DetailDrawerTab } from './DetailDrawer';
export { NotificationDrawer } from './NotificationDrawer';

// ── Charts ────────────────────────────────────────────────────────────────────
export { ChartContainer } from './ChartContainer';
export type { ChartContainerProps } from './ChartContainer';

// ── Feedback ─────────────────────────────────────────────────────────────────
export { RiskBadge } from './RiskBadge';
export { StatusPill } from './StatusPill';
export { AgentStatusIndicator } from './AgentStatusIndicator';
export { InterlinkChip } from './InterlinkChip';
export { AuditTrail } from './AuditTrail';
export { ContextualAlert } from './ContextualAlert';
export { SlideOverPanel } from './SlideOverPanel';
export { MetricGauge } from './MetricGauge';
export { MetricStrip } from './MetricStrip';
export type { MetricStripItem } from './MetricStrip';

