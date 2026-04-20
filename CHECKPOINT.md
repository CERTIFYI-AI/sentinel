
## 2026-04-20 15:00 NPT — ORGANIZATION realtime wired

- dashboard/src/hooks/useRealtimeInvalidation.ts
  - Added 5 missing ORG tables: assets, bia_processes, committees, identities, roles
  - Aligned existing keys to consumer query keys: ethics_reports, training_courses, bcp_plans, bias_audits
  - Total REALTIME_TABLES rows now cover 9/9 ORG modules (grep confirmed count=9)
- Hook already mounted at App.tsx:233 → fires globally for authenticated session
- DB side: all 9 tables confirmed rls_enabled=true, realtime=true (Supabase SQL run 15:00)
- Result: Access Control, Committee Mgmt, Training, Maturity, Continuity, Ethics Reporting, Asset Registry, Identity Governance, Business Impact pages now auto-refresh on any tenant-visible row change.
