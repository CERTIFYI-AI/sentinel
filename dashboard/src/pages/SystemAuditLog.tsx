// CONSOLIDATED (2026-08-14 IA restructure): merged into pages/AuditTrail.tsx
// (canonical route: /audit-trail). This page was a static mock with no
// backend; the canonical page reads the real org-scoped `audit_log` table.
//
// This file is a temporary re-export shim only because App.tsx (owned by the
// nav/routes agent) still lazy-imports it for /system-audit-log.
// DELETE this file when /system-audit-log is redirected to /audit-trail.
export { default } from './AuditTrail';
