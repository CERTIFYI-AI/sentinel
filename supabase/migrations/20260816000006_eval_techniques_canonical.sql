-- 20260816_eval_techniques_canonical.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- The Eval Techniques page ran on the generic `evaltechniques_table
-- (id, doc jsonb)` demo table, seeded from a hardcoded TECHNIQUES_SEED array,
-- with local-only writes that toasted success regardless of outcome.
--
-- A real `public.eval_techniques` table already existed from the evals pass
-- (id, org_id, name, category, description, methodology, example_prompt,
-- scoring_method, status, owner, metadata) but nothing ever read or wrote it —
-- it held zero rows. Rather than create a competing table, extend that one with
-- the fields the page needs, then repoint the page at it.

alter table public.eval_techniques
  add column if not exists applicable_types text[]  not null default '{}',
  add column if not exists cadence          text    not null default 'quarterly',  -- continuous | monthly | quarterly | semiannual | annual | ad_hoc
  add column if not exists icon_key         text    not null default 'flask',
  add column if not exists last_run_at      date,
  add column if not exists next_due_at      date,
  add column if not exists linked_model_ids uuid[]  not null default '{}',         -- → ai_models.id
  add column if not exists reference_url    text,
  add column if not exists is_deleted       boolean not null default false;

alter table public.eval_techniques enable row level security;
drop policy if exists eval_techniques_org_isolation on public.eval_techniques;
create policy eval_techniques_org_isolation on public.eval_techniques
  for all using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());

create index if not exists eval_techniques_org_idx      on public.eval_techniques (org_id);
create index if not exists eval_techniques_category_idx on public.eval_techniques (category);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seeds (demo org), Nepali-bank narrative. Idempotent on fixed uuids.
-- linked_model_ids point at real ai_models rows so each technique surfaces on
-- the model records it governs.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.eval_techniques
 (id, org_id, name, description, category, methodology, scoring_method, applicable_types, cadence, status, icon_key, last_run_at, next_due_at, owner, linked_model_ids)
values
 ('88888888-8888-4888-8888-000000000801','00000000-0000-0000-0000-000000000001',
  'Accuracy & F1 Score Testing',
  'Measures accuracy, precision, recall and F1 against a labelled holdout set. Baseline check for every classification and regression model.',
  'performance','Stratified holdout scored against the labelled ground-truth set.','Macro F1 with per-class precision/recall',
  array['ML — Classification','ML — Regression','ML — NLP'],'monthly','completed','check-circle',
  '2026-08-01','2026-09-01','Nabin Maharjan',
  array['83a20820-aa10-4216-8ad6-80e4261071cf','e61f991b-7da7-4b81-9deb-aa8665bb6ac1']::uuid[]),
 ('88888888-8888-4888-8888-000000000802','00000000-0000-0000-0000-000000000001',
  'Fairness & Bias Audit',
  'Disparate-impact testing across protected attributes — province, caste/ethnicity, gender and age — against EU AI Act Article 10 and NRB fair-lending expectations.',
  'fairness','Slice the holdout by protected attribute and compare selection and error rates.','Disparate impact ratio, equalised odds gap',
  array['ML — Classification','LLM — Generative','ML — NLP'],'quarterly','in_progress','scales',
  '2026-07-20','2026-10-20','Anita Gurung',
  array['83a20820-aa10-4216-8ad6-80e4261071cf']::uuid[]),
 ('88888888-8888-4888-8888-000000000803','00000000-0000-0000-0000-000000000001',
  'Robustness & Drift Stress Testing',
  'Stability under distribution shift and noisy inputs. Covers the festival-season surge that shifts remittance and lending traffic.',
  'robustness','Replay perturbed and shifted traffic windows against the deployed model.','PSI drift score, accuracy delta under shift',
  array['ML — Classification','ML — Anomaly Detection'],'quarterly','completed','gauge',
  '2026-07-28','2026-10-28','Bikash Thapa',
  array['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']::uuid[]),
 ('88888888-8888-4888-8888-000000000804','00000000-0000-0000-0000-000000000001',
  'Adversarial & Jailbreak Probing',
  'Red-team prompt battery including romanized-Nepali and code-switched attacks against generative endpoints.',
  'security','Run the adversarial prompt suite through the live guardrail chain.','Block rate; count of successful leaks',
  array['LLM — Generative'],'monthly','in_progress','shield-warning',
  '2026-08-10','2026-09-10','Sarita Poudel',
  array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[]),
 ('88888888-8888-4888-8888-000000000805','00000000-0000-0000-0000-000000000001',
  'Hallucination & Groundedness Scoring',
  'Checks generated answers against retrieved sources and flags unsupported claims in customer-facing responses.',
  'quality','Compare each claim in the answer against the retrieved context.','Groundedness rate, unsupported-claim count',
  array['LLM — Generative','RAG'],'monthly','completed','magnifying-glass',
  '2026-08-05','2026-09-05','Sarita Poudel',
  array['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[]),
 ('88888888-8888-4888-8888-000000000806','00000000-0000-0000-0000-000000000001',
  'Explainability & Reason-Code Review',
  'Verifies that adverse-action reason codes are faithful to the model and intelligible to a branch officer.',
  'explainability','Sample declined applications and compare reason codes to attributions.','Faithfulness score; reviewer intelligibility rating',
  array['ML — Classification'],'quarterly','planned','lightbulb',
  null,'2026-09-30','Deepa Karki',
  array['83a20820-aa10-4216-8ad6-80e4261071cf']::uuid[]),
 ('88888888-8888-4888-8888-000000000807','00000000-0000-0000-0000-000000000001',
  'PII Leakage & Data Minimisation Test',
  'Probes for training-data memorisation and PII echo in outputs, and checks retention limits on captured prompts.',
  'privacy','Membership-inference and extraction probes plus a retention audit.','Leak count; retention conformance',
  array['LLM — Generative','ML — NLP'],'quarterly','planned','lock',
  null,'2026-10-15','Rajesh Shrestha','{}'::uuid[]),
 ('88888888-8888-4888-8888-000000000808','00000000-0000-0000-0000-000000000001',
  'Champion/Challenger Benchmarking',
  'Scores a candidate model against the incumbent on the same holdout before any promotion decision.',
  'performance','Run both models over an identical holdout and compare.','Paired metric delta with significance',
  array['ML — Classification','ML — Regression'],'semiannual','completed','chart-line',
  '2026-06-30','2026-12-31','Nabin Maharjan','{}'::uuid[])
on conflict (id) do nothing;
