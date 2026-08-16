-- 20260813000013_repo_org_resolver.sql
--
-- Documentation-of-truth: public.current_user_org_id() is ALREADY APPLIED on
-- the live database but was missing from the repo, so a from-zero replay had
-- no definition for the org resolver that RLS policies and column defaults
-- depend on (e.g. ai_models.org_id default). This file matches the LIVE
-- definition exactly — do not "improve" it here without also changing it
-- live; create or replace makes it a safe no-op re-apply.

create or replace function public.current_user_org_id() returns uuid language sql stable security definer set search_path='' as $$ select org_id from public.user_profiles where id = auth.uid() limit 1; $$;
