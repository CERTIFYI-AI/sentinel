-- Align risks.tenant_id scoping with the platform pattern used by ai_models:
-- the DB default (current_user_org_id()) fills the tenant column, never the
-- client. Without this, client inserts fell back to the legacy 'default'
-- literal and were rejected by the risks_org_scoped RLS policy
-- (tenant_id = current_user_org_id()::text).
--
-- Idempotent: SET DEFAULT is repeat-safe.
alter table public.risks
  alter column tenant_id set default (current_user_org_id())::text;
