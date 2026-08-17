-- Explainability store: one row per (model, version, method) computed offline by
-- a SHAP/LIME job. Org-scoped via get_org_id(); read by the Model Detail page.
-- Applied live via Supabase MCP on 2026-08-13.
create table if not exists public.model_explanations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.get_org_id(),
  model_id text not null,
  model_version text,
  method text not null default 'SHAP',
  shap jsonb not null default '[]'::jsonb,       -- [{feature, importance}]
  lime jsonb not null default '[]'::jsonb,       -- [{feature, impact}]
  sample_size int,
  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists model_explanations_model_idx on public.model_explanations(model_id, computed_at desc);

alter table public.model_explanations enable row level security;
drop policy if exists model_explanations_org on public.model_explanations;
create policy model_explanations_org on public.model_explanations
  for all using (org_id = public.get_org_id()) with check (org_id = public.get_org_id());
