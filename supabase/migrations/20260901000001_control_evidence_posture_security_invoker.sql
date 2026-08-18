-- ---------------------------------------------------------------------------
-- 20260901000001_control_evidence_posture_security_invoker.sql
--
-- Fix the "Security Definer View" advisor lint on
-- public.control_evidence_posture (raised 2026-08-18; confirmed still present on
-- the live project — the view carried no security_invoker option).
--
-- WHY IT MATTERS. The view aggregates control_finding_evidence joined to
-- integration_findings and groups by org_id, but it carries NO org predicate of
-- its own — it relied entirely on the base tables' RLS to scope rows to the
-- caller. A view without security_invoker runs with the VIEW OWNER's rights, so
-- that RLS is bypassed: any authenticated tenant could read every org's
-- control-evidence posture. Same class as TD-000.
--
-- THE FIX. Recreate the view WITH (security_invoker = true) so RLS on
-- control_finding_evidence and integration_findings is enforced as the QUERYING
-- user. Add an explicit `where cfe.org_id = current_user_org_id()` as defence in
-- depth (using current_user_org_id(), which exists on live — NOT
-- auth.current_org_id(), which does not).
--
-- SAFETY. Idempotent (create or replace). No code currently reads this view
-- (grep across dashboard/src, sentinel/, supabase/functions turned up zero
-- readers), so this closes a latent cross-tenant read before anything wires to
-- it — with no behavioural change to break. A service-role reader would see
-- zero rows (current_user_org_id() is NULL under the service role); none exists,
-- and the intended reader is the authenticated dashboard.
--
-- VERIFY LIVE by impersonating a real authenticated tenant (a fictitious sub
-- resolves current_user_org_id() to NULL and returns nothing — a false
-- negative), and confirm tenant A sees only tenant A's rows.
-- ---------------------------------------------------------------------------

create or replace view public.control_evidence_posture
  with (security_invoker = true) as
select
  cfe.org_id,
  cfe.control_id,
  count(*)                                                    as findings_linked,
  count(*) filter (where f.status = 'PASSED')                 as findings_passed,
  count(*) filter (where f.status = 'FAILED')                 as findings_failed,
  max(f.collected_at)                                         as last_evidence_at,
  case
    when count(*) filter (where f.status = 'FAILED'
                          and f.severity in ('CRITICAL', 'HIGH')) > 0 then 'failing'
    when count(*) filter (where f.status = 'FAILED') > 0            then 'needs_review'
    when count(*) filter (where f.status = 'PASSED') > 0            then 'passing'
    else 'no_evidence'
  end                                                         as posture
from public.control_finding_evidence cfe
join public.integration_findings f on f.id = cfe.integration_finding_id
where cfe.org_id = current_user_org_id()
group by cfe.org_id, cfe.control_id;

comment on view public.control_evidence_posture is
  'Per-control evidence posture. security_invoker=true so the base tables'' RLS '
  'is enforced as the querying user; explicitly org-scoped via '
  'current_user_org_id(). See 20260901000001.';
