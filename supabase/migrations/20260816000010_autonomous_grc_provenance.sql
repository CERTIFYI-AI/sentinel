-- 20260816_autonomous_grc_provenance.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- Autonomous GRC — provenance and interlink columns for agent-created records.
--
-- The governance mesh was dormant for two independent reasons:
--
--   1. `emitEvent` was never called from product code. The 26 agents were
--      registered at startup and functional, but nothing ever fired an event,
--      so no cascade had ever run. Fixed in modelService.upsertModel, which now
--      emits MODEL_REGISTERED on create.
--
--   2. The agents inserted column names that do not exist. riskAssessmentAgent
--      wrote title/category/impact/status/owner_id/org_id/related_entity_* to
--      `risks`, whose real columns are name/categories/potential_impact/
--      mitigation_status/action_owner/tenant_id. `safeInsert` catches the error,
--      logs a console warning and returns null — so even once triggered, the
--      cascade would have produced warnings and no records. Agent column
--      mappings are corrected in the agent source.
--
-- This migration adds the provenance and interlink columns an auto-created
-- governance record needs to be trustworthy:
--
--   source / auto_generated      — did a human or an agent create this? An
--                                  assessor asks this of any automated
--                                  governance record (AI Act Art. 14: a human
--                                  must be able to see and override what the
--                                  system decided).
--   related_entity_type / _id    — the interlink back to the model, dataset or
--                                  vendor whose registration triggered the
--                                  cascade, so an auto-created risk is never an
--                                  orphan.
--   source_event_id              — the governance_events row that caused it,
--                                  making the chain replayable end to end.

alter table public.risks
  add column if not exists source              text,
  add column if not exists auto_generated      boolean not null default false,
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id   uuid,
  add column if not exists source_event_id     uuid,
  add column if not exists metadata            jsonb not null default '{}'::jsonb;

alter table public.incidents
  add column if not exists source              text,
  add column if not exists auto_generated      boolean not null default false,
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id   uuid,
  add column if not exists source_event_id     uuid,
  add column if not exists metadata            jsonb not null default '{}'::jsonb;

create index if not exists risks_related_entity_idx     on public.risks (related_entity_type, related_entity_id);
create index if not exists risks_auto_generated_idx     on public.risks (auto_generated);
create index if not exists incidents_related_entity_idx on public.incidents (related_entity_type, related_entity_id);

-- `tasks` already carries linked_entity_type / linked_entity_id and
-- auto_generated, so HITL and remediation tasks need no schema change.
--
-- Verification (must succeed with the corrected agent mapping):
--
--   begin;
--   insert into public.risks (
--     name, description, categories, likelihood, severity, potential_impact,
--     risk_level, mitigation_status, action_owner, ai_lifecycle_phase,
--     assessment_date, source, auto_generated, related_entity_type,
--     related_entity_id, metadata
--   ) values (
--     'Auto: <model> — Initial AI Model Risk', '...', array['AI Model Risk'],
--     3, 4, '...', 'high', 'open', '<owner>', 'deployment', now(),
--     'auto-agent', true, 'model', '<model uuid>', '{}'::jsonb
--   );
--   rollback;
