-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
-- WS0.2 — SCIM User view.
--
-- SCIM needs a single-row projection of (auth.users + user_roles + profile)
-- keyed by org. We expose it as a SECURITY DEFINER view so the edge
-- function does not need to stitch three tables per request.

begin;

create or replace view public.scim_user_view
with (security_invoker = true) as
  select
    ur.user_id                           as id,
    ur.org_id                            as org_id,
    au.email                             as email,
    coalesce(up.full_name, au.email)     as display_name,
    (au.raw_app_meta_data ->> 'external_id') as external_id,
    (ur.deleted_at is null)              as is_active,
    ur.created_at                        as created_at,
    ur.updated_at                        as updated_at
  from public.user_roles ur
  join auth.users au on au.id = ur.user_id
  left join public.user_profiles up on up.id = ur.user_id;

-- SCIM traffic uses service-role; do not grant to anon/authenticated.
revoke all on public.scim_user_view from public, anon, authenticated;
grant select on public.scim_user_view to service_role;

commit;
