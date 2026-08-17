-- 20260817_admin_group_asset_bia_interlinks.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-17.
--
-- ADMIN group interlinks: Asset Registry <-> model/dataset registry, BIA, risks.
--
-- assets carried entity_id, entity_type, bia_rto_hours, bia_rpo_hours and
-- owner_id since it was created, and every one was null on all 10 rows. The
-- columns existed and the UI read them; the relationship was theoretical. An
-- asset register that cannot say which model an "AI Model" asset actually is
-- cannot answer an impact question, which is the only reason the register
-- exists.
--
-- Note on the cast: assets.entity_id is uuid but datasets.id is text. All 8
-- dataset ids are uuid-shaped so the cast is safe today. The type
-- inconsistency is real and is recorded in
-- docs/reference/platform-interlink-audit-2026-08-17.md.
--
-- Verified after apply: assets->registry 6/6, assets->BIA 8/8,
-- risks->assets 6/6, criticality agrees with risk_level on 10/10.

update public.assets set entity_type='ai_model',
  entity_id=(select id from public.ai_models where name='Credit Risk Scorer')
where asset_ref='AST-001';
update public.assets set entity_type='dataset',
  entity_id=(select id::uuid from public.datasets where name='KYC Document Corpus (Citizenship & NID)')
where asset_ref='AST-002';
update public.assets set entity_type='ai_model',
  entity_id=(select id from public.ai_models where name='Fraud Detection Engine')
where asset_ref='AST-003';
update public.assets set entity_type='ai_model',
  entity_id=(select id from public.ai_models where name='FraudShield ML')
where asset_ref='AST-007';
update public.assets set entity_type='ai_model',
  entity_id=(select id from public.ai_models where name='Customer Support Copilot')
where asset_ref='AST-009';
update public.assets set entity_type='dataset',
  entity_id=(select id::uuid from public.datasets where name='Agricultural Loan Applications (7 Provinces)')
where asset_ref='AST-010';

-- AST-004/005/006/008 are infrastructure and represent no registry record;
-- a null entity_id is the honest state there, not an omission.

-- criticality was uniformly 'medium' on every row while risk_level said High or
-- Medium. Two columns answering the same question differently is how a register
-- loses the reader's trust; criticality is now derived from risk_level.
-- REPLAY FIX (2026-08-17): risk_level is a live-only drift column; a bare
-- UPDATE aborts a from-zero replay. Guard on column existence.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='assets' and column_name='risk_level') then
    update public.assets
    set criticality = case lower(risk_level)
        when 'critical' then 'critical' when 'high' then 'high'
        when 'medium' then 'medium' else 'low' end
    where risk_level is not null;
  end if;
end $$;

-- bia_processes holds the RTO/RPO the business agreed; assets carried empty
-- copies of the same fields. Copying them by department lets Asset Registry
-- answer "how long can this be down?" from the BIA rather than from a second,
-- unmaintained number.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='bia_processes' and column_name='rto_hours') then
    update public.assets a set bia_rto_hours=p.rto_hours, bia_rpo_hours=p.rpo_hours
    from public.bia_processes p
    where lower(a.department)=lower(p.department) and a.bia_rto_hours is null;
  end if;
end $$;

-- risks.linked_asset_ids was empty on all 12 rows, so no risk could answer
-- "what breaks if this lands?".
update public.risks r set linked_asset_ids=array[a.id] from public.assets a
where a.asset_ref='AST-001' and r.id::text in ('risk-002','risk-006');
update public.risks r set linked_asset_ids=array[a.id] from public.assets a
where a.asset_ref='AST-003' and r.id::text='risk-007';
update public.risks r set linked_asset_ids=array[a.id] from public.assets a
where a.asset_ref='AST-009' and r.id::text in ('risk-001','risk-003');
update public.risks r set linked_asset_ids=array[a.id] from public.assets a
where a.asset_ref='AST-002' and r.id::text='risk-004';
