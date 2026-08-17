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
do $rel$ begin
  if exists (select 1 from information_schema.columns where table_schema='public'
             and table_name='consent_records' and column_name='tenant_id') then
    update public.consent_records set consent_ref = null where tenant_id = 'default';
  end if;
end $rel$;

-- REPLAY FIX (2026-08-17): several of these tables had tenant_id DROPped by
-- 20260421000008_ws01_tenancy_phase_a_unify, so a bare UPDATE aborts a
-- from-zero replay with "column tenant_id does not exist". The reclaim is only
-- meaningful where the column still exists, so guard each table individually.
do $reclaim$
declare t text;
begin
  foreach t in array array['consent_records','carbon_records','remediation_plans','transparency_reports'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'tenant_id') then
      execute format(
        'update public.%I set tenant_id = %L where tenant_id = %L',
        t, '00000000-0000-0000-0000-000000000001', 'default');
    end if;
  end loop;
end $reclaim$;

-- Remove the trap that produced the orphans. Every one of these tables now
-- fills tenant_id from the session's org, as ai_models has always done — the
-- client never chooses a tenant.
-- Same guard: set the default only where the column survived the tenancy unify.
do $defaults$
declare t text;
begin
  foreach t in array array['consent_records','carbon_records','remediation_plans','transparency_reports',
                           'bias_audits','compliance_scores','hitl_reviews','vendors'] loop
    if exists (select 1 from information_schema.columns
               where table_schema = 'public' and table_name = t and column_name = 'tenant_id') then
      execute format(
        'alter table public.%I alter column tenant_id set default (current_user_org_id())::text', t);
    end if;
  end loop;
end $defaults$;

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
