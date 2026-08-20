-- 20260906000003_phase4_identity_adapters.sql
--
-- Flip adapter_status to 'available' for Phase 4: identity provider adapters.
-- Idempotent.

update public.integration_catalog
set    adapter_status = 'available'
where  slug in (
  'auth0',
  'onelogin',
  'pingone',
  'ping_identity',
  'jumpcloud',
  'duo',
  '1password',
  '1password_device_trust_kolide',
  'keeper',
  'cyberark',
  'sailpoint',
  'one_identity'
)
  and adapter_status <> 'available';
