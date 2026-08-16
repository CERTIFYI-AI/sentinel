-- 20260816_reclaim_default_tenant_orphans.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- Found while populating the privacy interlinks: 15 rows across 4 tables were
-- stranded under the literal tenant_id 'default'.
--
-- Several tables used to carry `default 'default'::text` on tenant_id. Rows
-- written before those defaults were changed to current_user_org_id() kept the
-- literal string. Every RLS policy on these tables reads
--
--     tenant_id = (current_user_org_id())::text
--
-- so those rows are invisible to every authenticated user. They are not
-- deleted and not corrupt — they are unreachable, which is the worst state a
-- governance record can be in. The consent register displayed 6 of its 10
-- records and nothing in the UI could reveal the gap; the same silence applied
-- to 5 carbon records, 4 remediation plans and 2 transparency reports.
--
-- Reassignment is safe here because each of these tables has exactly one real
-- tenant (00000000-0000-0000-0000-000000000001). This is NOT a general remedy
-- and must not be copied into a genuinely multi-tenant deployment, where an
-- orphaned row's true owner cannot be inferred and the rows would have to be
-- quarantined for manual attribution instead.

-- Both tenant partitions had independently numbered CNS-2026-001 and -002, so
-- the references must be released before the merge or the unique index on
-- (tenant_id, consent_ref) rejects it.
update public.consent_records set consent_ref = null where tenant_id = 'default';

update public.consent_records      set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id = 'default';
update public.carbon_records       set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id = 'default';
update public.remediation_plans    set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id = 'default';
update public.transparency_reports set tenant_id = '00000000-0000-0000-0000-000000000001' where tenant_id = 'default';

-- Remove the trap that produced the orphans. Every one of these tables now
-- fills tenant_id from the session's org, as ai_models has always done — the
-- client never chooses a tenant.
alter table public.consent_records      alter column tenant_id set default (current_user_org_id())::text;
alter table public.carbon_records       alter column tenant_id set default (current_user_org_id())::text;
alter table public.remediation_plans    alter column tenant_id set default (current_user_org_id())::text;
alter table public.transparency_reports alter column tenant_id set default (current_user_org_id())::text;
alter table public.bias_audits          alter column tenant_id set default (current_user_org_id())::text;
alter table public.compliance_scores    alter column tenant_id set default (current_user_org_id())::text;
alter table public.hitl_reviews         alter column tenant_id set default (current_user_org_id())::text;
alter table public.vendors              alter column tenant_id set default (current_user_org_id())::text;

-- Renumber the merged consent register as one sequence.
update public.consent_records c set consent_ref = s.ref from (
  select id, 'CNS-' || to_char(coalesce(created_at, now()), 'YYYY') || '-' ||
         lpad(row_number() over (partition by tenant_id, to_char(coalesce(created_at, now()), 'YYYY')
                                 order by created_at, id)::text, 3, '0') as ref
  from public.consent_records
) s where s.id = c.id;

-- consent_records carried two byte-identical ALL policies
-- (consent_records_org and consent_records_org_isolation); one is enough.
drop policy if exists consent_records_org_isolation on public.consent_records;
