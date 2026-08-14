// CONSOLIDATED (2026-08-14 IA restructure): merged into pages/AuditTrail.tsx
// (canonical route: /audit-trail).
//
// The hash-chain explorer view was NOT carried over: it queried audit_log
// columns (sequence_no, row_hash, previous_hash, occurred_at, outcome,
// severity) and an RPC (audit_log_verify_chain) that do not exist in this
// project's live database, so the chain display could never show real data.
//
// This file is a temporary re-export shim only because App.tsx (owned by the
// nav/routes agent) still lazy-imports it for /audit-log/chain.
// DELETE this file when /audit-log/chain is redirected to /audit-trail.
export { default } from './AuditTrail';
