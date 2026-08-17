-- Client audit writes must satisfy audit_insert's with_check
-- (org_id = current_user_org_id()); default the column so fire-and-forget
-- logAction() calls pass without the client setting org_id.
-- Applied live via Supabase MCP on 2026-08-13.
alter table public.audit_log alter column org_id set default current_user_org_id();
