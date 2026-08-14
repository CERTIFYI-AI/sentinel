// CONSOLIDATED (2026-08-14 IA restructure): merged into pages/AuditTrail.tsx
// (canonical route: /audit-trail), which reads the real org-scoped `audit_log`
// table with an honest empty state (this page's seed fallback was dropped).
//
// This file is a temporary re-export shim only because App.tsx (owned by the
// nav/routes agent) still lazy-imports it for /audit-log.
// DELETE this file when /audit-log is redirected to /audit-trail.
export { default } from './AuditTrail';
