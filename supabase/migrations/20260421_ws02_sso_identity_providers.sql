-- Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
-- WS0.2 — Enterprise SSO: identity provider, domain claim, SCIM state.

begin;

-- ---------------------------------------------------------------------------
-- 1. identity_providers — one row per SAML/OIDC connection owned by an org.
-- ---------------------------------------------------------------------------
create table if not exists public.identity_providers (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete restrict,
  kind          text not null check (kind in ('saml', 'oidc')),
  display_name  text not null,
  -- Provider-specific opaque config (issuer, SSO URL, certs, client_id, ...).
  -- Never contains long-lived secrets client-side; service-role only.
  config        jsonb not null default '{}'::jsonb,
  -- IdP attribute path that supplies the user's group/role claim.
  -- JIT mapping reads this and converts to user_roles rows.
  group_claim_path text,
  -- IdP attribute path that carries org identity (for multi-org users).
  org_claim_path   text,
  is_enabled    boolean not null default false,
  -- If true, users logging in via this IdP cannot change their profile fields.
  is_provisioned_only boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  deleted_at    timestamptz
);

create index if not exists identity_providers_org_id_idx
  on public.identity_providers (org_id, created_at desc);

create unique index if not exists identity_providers_org_kind_name_uq
  on public.identity_providers (org_id, kind, display_name)
  where deleted_at is null;

alter table public.identity_providers enable row level security;

create policy ws01_org_read on public.identity_providers
  for select using (org_id = auth.current_org_id());
create policy ws01_org_insert on public.identity_providers
  for insert with check (org_id = auth.current_org_id());
create policy ws01_org_update on public.identity_providers
  for update using (org_id = auth.current_org_id())
  with check (org_id = auth.current_org_id());
create policy ws01_org_delete on public.identity_providers
  for delete using (org_id = auth.current_org_id());
create policy ws01_service_all on public.identity_providers
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2. identity_provider_domains — email-domain → IdP routing (HRD).
--    When a user types joe@acme.com on the login page, Sentinel looks up
--    the matching row here and redirects them to the correct SAML/OIDC
--    endpoint before they ever see a password field.
-- ---------------------------------------------------------------------------
create table if not exists public.identity_provider_domains (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete restrict,
  provider_id  uuid not null references public.identity_providers(id) on delete cascade,
  domain       text not null,
  is_verified  boolean not null default false,
  verification_token text,
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz,
  constraint identity_provider_domains_domain_shape
    check (domain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$')
);

create unique index if not exists identity_provider_domains_domain_uq
  on public.identity_provider_domains (domain)
  where deleted_at is null and is_verified = true;

create index if not exists identity_provider_domains_org_id_idx
  on public.identity_provider_domains (org_id, created_at desc);

alter table public.identity_provider_domains enable row level security;

create policy ws01_org_read on public.identity_provider_domains
  for select using (org_id = auth.current_org_id());
create policy ws01_org_insert on public.identity_provider_domains
  for insert with check (org_id = auth.current_org_id());
create policy ws01_org_update on public.identity_provider_domains
  for update using (org_id = auth.current_org_id())
  with check (org_id = auth.current_org_id());
create policy ws01_org_delete on public.identity_provider_domains
  for delete using (org_id = auth.current_org_id());
create policy ws01_service_all on public.identity_provider_domains
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Verified-domain lookup is unauthenticated (login page routing) but reads
-- only the minimal fields needed — domain + provider_id + kind — and is
-- rate-limited at the edge function. Exposed via a SECURITY DEFINER view.
create or replace function public.lookup_idp_by_domain(p_domain text)
returns table (
  provider_id uuid,
  org_id uuid,
  kind text,
  display_name text,
  is_enabled boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select ip.id, ip.org_id, ip.kind, ip.display_name, ip.is_enabled
  from public.identity_provider_domains d
  join public.identity_providers ip on ip.id = d.provider_id
  where d.domain = lower(trim(p_domain))
    and d.is_verified = true
    and d.deleted_at is null
    and ip.deleted_at is null
    and ip.is_enabled = true
  limit 1;
$$;

revoke all on function public.lookup_idp_by_domain(text) from public;
grant execute on function public.lookup_idp_by_domain(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. scim_tokens — short-lived bearer tokens for SCIM 2.0 endpoints.
--    IdP (Okta, Azure AD, WorkOS) calls /scim/v2/Users with Bearer <token>.
--    Tokens are stored HMAC-hashed; the plaintext is shown exactly once
--    when generated (same pattern as GitHub PATs).
-- ---------------------------------------------------------------------------
create table if not exists public.scim_tokens (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete restrict,
  provider_id  uuid not null references public.identity_providers(id) on delete cascade,
  name         text not null,
  token_prefix text not null,    -- first 8 chars for UI display, e.g. "scim_abc1"
  token_hash   text not null,    -- sha256 hex of the full token
  scopes       text[] not null default array['users:read','users:write','groups:read']::text[],
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz
);

create unique index if not exists scim_tokens_token_hash_uq
  on public.scim_tokens (token_hash);

create index if not exists scim_tokens_org_id_idx
  on public.scim_tokens (org_id, created_at desc);

alter table public.scim_tokens enable row level security;

-- scim_tokens are never readable by end users — only service-role.
create policy ws02_service_only_all on public.scim_tokens
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. scim_audit_events — every SCIM call, whether it succeeded or not.
--    Separate from audit_events because SCIM noise would drown out the
--    human-readable audit trail; queried via CEF/Splunk exporters.
-- ---------------------------------------------------------------------------
create table if not exists public.scim_audit_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete restrict,
  provider_id     uuid references public.identity_providers(id) on delete set null,
  token_id        uuid references public.scim_tokens(id) on delete set null,
  method          text not null,              -- GET, POST, PUT, PATCH, DELETE
  path            text not null,              -- /scim/v2/Users/...
  status_code     int  not null,
  external_id     text,                       -- IdP-side user id
  sentinel_user_id uuid,                      -- our auth.users.id if resolved
  ip_address      inet,
  user_agent      text,
  request_digest  text,                       -- sha256 of request body
  error_code      text,
  latency_ms      int,
  created_at      timestamptz not null default now()
);

create index if not exists scim_audit_events_org_id_created_at_idx
  on public.scim_audit_events (org_id, created_at desc);

create index if not exists scim_audit_events_provider_id_idx
  on public.scim_audit_events (provider_id, created_at desc);

alter table public.scim_audit_events enable row level security;

create policy ws01_org_read on public.scim_audit_events
  for select using (org_id = auth.current_org_id());
-- SCIM audit rows are append-only; inserts/updates/deletes are service-role only.
create policy ws02_service_write on public.scim_audit_events
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. sso_sessions — tracks active SSO-backed sessions for step-up/MFA hand-off.
--    Created by /sso/callback edge function, consumed by MFA gate in WS4.
-- ---------------------------------------------------------------------------
create table if not exists public.sso_sessions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete restrict,
  user_id         uuid not null,
  provider_id     uuid not null references public.identity_providers(id) on delete cascade,
  external_subject text not null,   -- NameID (SAML) or sub (OIDC)
  started_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  revoked_at      timestamptz,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  deleted_at      timestamptz
);

create unique index if not exists sso_sessions_active_subject_uq
  on public.sso_sessions (provider_id, external_subject)
  where revoked_at is null;

create index if not exists sso_sessions_org_id_user_idx
  on public.sso_sessions (org_id, user_id, started_at desc);

alter table public.sso_sessions enable row level security;

create policy ws01_org_read on public.sso_sessions
  for select using (org_id = auth.current_org_id() and user_id = auth.uid());
create policy ws02_service_all on public.sso_sessions
  for all using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 6. update_updated_at trigger — applied to all mutable WS0.2 tables.
-- ---------------------------------------------------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'identity_providers','identity_provider_domains','scim_tokens','sso_sessions'
  ]
  loop
    execute format('drop trigger if exists ws02_touch_updated_at on public.%I', t);
    execute format(
      'create trigger ws02_touch_updated_at before update on public.%I
         for each row execute function public.tg_touch_updated_at()',
      t
    );
  end loop;
end$$;

commit;
