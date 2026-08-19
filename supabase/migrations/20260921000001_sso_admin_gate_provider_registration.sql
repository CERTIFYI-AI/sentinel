-- ---------------------------------------------------------------------------
-- 20260921000001 — Admin-gate SSO provider registration (audit H1 / TD-024)
--
-- WHY: the second-pass audit's headline finding. The `identity_providers`
-- INSERT policy (`ws01_org_insert`, 20260421000013) allowed ANY org member to
-- register an OIDC/SAML provider for their org with fully attacker-controlled
-- config (issuer, jwks_uri, token_endpoint, client_id). That is the enabling
-- condition for the SSO account-takeover: a non-admin could stand up a provider
-- pointing at an IdP they control. Registering an identity provider — and
-- marking a domain verified — are administrative acts; gate both on
-- `public.is_org_admin()` (role in owner/admin).
--
-- The callback-side defences (email_verified + verified-domain binding) ship in
-- the edge function; this migration closes the registration surface beneath
-- them. Lineage-guarded and idempotent: only touches objects that exist, and
-- no-ops where the admin helper is absent (leaving the prior, tenant-scoped
-- policy in place rather than failing).
-- ---------------------------------------------------------------------------

do $$
declare
  has_admin_fn boolean := exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_org_admin'
  );
  has_curorg_fn boolean := exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'current_org_id'
  );
begin
  if not (has_admin_fn and has_curorg_fn) then
    raise notice 'is_org_admin()/auth.current_org_id() absent — leaving SSO insert policies unchanged';
    return;
  end if;

  -- identity_providers: only an admin may register a provider.
  if to_regclass('public.identity_providers') is not null then
    execute 'drop policy if exists ws01_org_insert on public.identity_providers';
    execute $p$
      create policy ws01_org_insert on public.identity_providers
        for insert
        with check (org_id = auth.current_org_id() and public.is_org_admin())
    $p$;
  end if;

  -- identity_provider_domains: only an admin may add a domain or flip
  -- is_verified. Domain verification is the trust anchor the callback relies on,
  -- so a non-admin must not be able to assert it.
  if to_regclass('public.identity_provider_domains') is not null then
    execute 'drop policy if exists ws01_org_insert on public.identity_provider_domains';
    execute $p$
      create policy ws01_org_insert on public.identity_provider_domains
        for insert
        with check (org_id = auth.current_org_id() and public.is_org_admin())
    $p$;
    execute 'drop policy if exists ws01_org_update on public.identity_provider_domains';
    execute $p$
      create policy ws01_org_update on public.identity_provider_domains
        for update
        using (org_id = auth.current_org_id() and public.is_org_admin())
        with check (org_id = auth.current_org_id() and public.is_org_admin())
    $p$;
  end if;
end $$;
