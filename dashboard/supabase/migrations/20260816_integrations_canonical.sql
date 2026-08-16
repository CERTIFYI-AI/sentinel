
-- ─────────────────────────────────────────────────────────────────────────────
-- Task seeds: re-point the demo work queue at the Nepali-bank narrative and
-- wire every row to a real governed entity (model / integration / training),
-- so the board is reachable from — and back to — the rest of the platform.
-- ─────────────────────────────────────────────────────────────────────────────

update public.tasks set
  title = 'Reweight Karnali & Sudurpashchim training samples',
  description = 'Bias audit BIA-2026-001 flagged province coverage gaps (Karnali 3.1% of training rows). Reweight and re-run the fairness slices before the next model release.',
  assignees = array['Nabin Maharjan','Anita Gurung'],
  priority = 'critical', status = 'in_progress', due_date = '2026-09-15T00:00:00Z',
  linked_entity_type = 'model', linked_entity_id = '83a20820-aa10-4216-8ad6-80e4261071cf',
  linked_items = jsonb_build_object('source','BIA-2026-001','sourceType','bias_audit','sourceLink','/bias-audits')
where id = 'task-001';

update public.tasks set
  title = 'Recalibrate fraud thresholds before Dashain 2083 surge',
  description = 'Validation run VAL-2026-102 found structuring evasion at 0.12 vs 0.10 tolerance during festival windows. Conditional approval requires recalibration.',
  assignees = array['Bikash Thapa'],
  priority = 'critical', status = 'in_progress', due_date = '2026-09-20T00:00:00Z',
  linked_entity_type = 'model', linked_entity_id = 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1',
  linked_items = jsonb_build_object('source','VAL-2026-102','sourceType','validation_run','sourceLink','/model-validation')
where id = 'task-002';

update public.tasks set
  title = 'Augment KYC training set with pre-2047 BS handwritten documents',
  description = 'Handwritten citizenship OCR at 0.83 vs 0.90 target, over-rejecting older rural applicants. Blocks VAL-2026-103 sign-off.',
  assignees = array['Nabin Maharjan'],
  priority = 'high', status = 'todo', due_date = '2026-09-30T00:00:00Z',
  linked_entity_type = 'model', linked_entity_id = '30e2d2ae-b71d-49eb-9b90-daf0d78aa070',
  linked_items = jsonb_build_object('source','BIA-2026-003','sourceType','bias_audit','sourceLink','/bias-audits')
where id = 'task-003';

update public.tasks set
  title = 'Close romanized-Nepali jailbreak gap in copilot guardrails',
  description = 'Guardrail sweep CMP-2026-401 block rate 0.94 vs 0.95 bar; two probes leaked internal note content. Blocks copilot production sign-off.',
  assignees = array['Sarita Poudel'],
  priority = 'high', status = 'review', due_date = '2026-08-29T00:00:00Z',
  linked_entity_type = 'model', linked_entity_id = 'bd167875-01d2-4afb-aa11-b25b6dbd4d09',
  linked_items = jsonb_build_object('source','VAL-2026-104','sourceType','validation_run','sourceLink','/model-validation')
where id = 'task-004';

update public.tasks set
  title = 'Quarterly vendor review — AI subprocessors on the trust page',
  description = 'Re-assess the three subprocessors published on the trust center and refresh DPAs.',
  assignees = array['Deepa Karki'],
  priority = 'medium', status = 'in_progress', due_date = '2026-09-05T00:00:00Z',
  linked_entity_type = 'vendor', linked_entity_id = null,
  linked_items = jsonb_build_object('source','Vendor registry','sourceType','vendor','sourceLink','/vendors')
where id = 'task-005';

update public.tasks set
  title = 'Rotate team-messaging integration key (delivery failing)',
  description = 'Alert delivery integration returning 401; guardrail and SLA alerts are not reaching the channel.',
  assignees = array['Sarita Poudel'],
  priority = 'critical', status = 'todo', due_date = '2026-08-20T00:00:00Z',
  linked_entity_type = 'integration', linked_entity_id = '44444444-4444-4444-8444-000000000408',
  linked_items = jsonb_build_object('source','Team Messaging','sourceType','integration','sourceLink','/integrations')
where id = 'task-006';

update public.tasks set
  title = 'Investigate remittance switch latency during surge windows',
  description = 'Connector health degraded; elevated latency on payout events feeding the fraud engine.',
  assignees = array['Bikash Thapa','Rajesh Shrestha'],
  priority = 'high', status = 'in_progress', due_date = '2026-09-01T00:00:00Z',
  linked_entity_type = 'integration', linked_entity_id = '44444444-4444-4444-8444-000000000404',
  linked_items = jsonb_build_object('source','Remittance Switch','sourceType','integration','sourceLink','/integrations')
where id = 'task-007';

update public.tasks set
  title = 'Complete fair lending training for remaining credit officers',
  description = 'TRN-2026-002 completion at 25% — Prakash Adhikari in progress, two enrolled. Required before Q3 lending review.',
  assignees = array['Anita Gurung'],
  priority = 'medium', status = 'todo', due_date = '2026-09-30T00:00:00Z',
  linked_entity_type = 'training', linked_entity_id = '22222222-2222-4222-8222-000000000202',
  linked_items = jsonb_build_object('source','TRN-2026-002','sourceType','training','sourceLink','/ai-literacy')
where id = 'task-008';
