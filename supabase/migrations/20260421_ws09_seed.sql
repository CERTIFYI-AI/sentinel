-- REPLAY NOTE (2026-08-16): this legacy seed/integration file predates the
-- repo's replay contract and contains statements that contradict the
-- repo-defined schema (they only ever applied against the live database's
-- out-of-band state, and some never applied cleanly anywhere). Each top-level
-- statement is now wrapped to be individually fault-tolerant: compatible
-- statements still seed a fresh environment; incompatible ones raise a
-- WARNING instead of aborting the replay. Live behavior is unchanged.
-- Canonical demo data lives in the 202608xx seed migrations.
-- See supabase/migrations/README.md.

-- SPDX-License-Identifier: Apache-2.0
-- Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
-- WS9 — Admin seed. Idempotent via ON CONFLICT DO NOTHING.
BEGIN;

DO $seed$
BEGIN
  -- ============================================================
  -- Demo tenant
  -- ============================================================
  INSERT INTO organizations (id, name, slug, created_at, updated_at)
    VALUES ('b3d55edc-1e3a-5166-8a89-29197596db90', 'Acme Industries', 'acme-industries', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 12 demo users, one per canonical RBAC role
  -- ============================================================
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('186a5fac-e9b0-529b-8539-47e0d25aacff', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'org_admin@acme.demo', 'org admin (Demo)', 'org_admin', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('ec4087e8-924c-5a44-85b5-8a0662794917', '186a5fac-e9b0-529b-8539-47e0d25aacff', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'org_admin', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('580df925-7a7b-5145-85e0-e85f4f5e1176', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'security_admin@acme.demo', 'security admin (Demo)', 'security_admin', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('ca027d71-030c-5222-80a2-c0107d830aaa', '580df925-7a7b-5145-85e0-e85f4f5e1176', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'security_admin', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('f66ca424-df86-5428-83e3-2117045b6faa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'compliance_officer@acme.demo', 'compliance officer (Demo)', 'compliance_officer', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('d58c72f5-7ad4-59a4-86bb-e79326acdd51', 'f66ca424-df86-5428-83e3-2117045b6faa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'compliance_officer', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('d9d039f0-24c4-5a7a-8d13-e9241fc01a3b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'risk_manager@acme.demo', 'risk manager (Demo)', 'risk_manager', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('988afd3f-7e47-51a1-8cc9-aa032dee9ac9', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'risk_manager', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('a48e314a-d056-599c-8b6c-0c2aab05fee5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'privacy_officer@acme.demo', 'privacy officer (Demo)', 'privacy_officer', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('74b5acc4-51e2-577a-82af-ffe09a7b0dab', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'privacy_officer', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('d9b55c03-e8e7-592b-8b1d-609f645132a2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'auditor_internal@acme.demo', 'auditor internal (Demo)', 'auditor_internal', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('ab423d59-3503-5a99-84da-70403f1d4ab3', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'auditor_internal', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('4e303363-17b3-588f-849f-551b203f3e20', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'auditor_external@acme.demo', 'auditor external (Demo)', 'auditor_external', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('15c0c451-14b2-5cfe-8480-c229e43e8c09', '4e303363-17b3-588f-849f-551b203f3e20', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'auditor_external', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('540d259a-2567-5be4-8c82-cbc006cf1a5a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'incident_responder@acme.demo', 'incident responder (Demo)', 'incident_responder', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('e24b02cd-7848-5c2f-81d5-10159ed0d54c', '540d259a-2567-5be4-8c82-cbc006cf1a5a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'incident_responder', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'control_owner@acme.demo', 'control owner (Demo)', 'control_owner', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('0168c119-a816-564a-8a50-2c85ec411d9e', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'control_owner', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('cb194d12-45ae-5b20-87f6-d46ca9a5ea30', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'policy_author@acme.demo', 'policy author (Demo)', 'policy_author', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('79735a85-70a3-5878-82c4-94d7ac3fc098', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'policy_author', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('3938545a-d4e1-5def-8d7e-b93b1ecae1e7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'vendor_manager@acme.demo', 'vendor manager (Demo)', 'vendor_manager', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('c77851a8-6f55-514e-89df-e9f14da2c286', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'vendor_manager', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO demo_users (id, org_id, email, full_name, primary_role, created_at, updated_at)
    VALUES ('90712505-0723-5149-82e2-1d4ef2c6be6e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'viewer@acme.demo', 'viewer (Demo)', 'viewer', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO user_role_bindings (id, user_id, org_id, role, granted_by, created_at, updated_at)
    VALUES ('3051bbe1-e448-5b55-844d-a4c08fa45eed', '90712505-0723-5149-82e2-1d4ef2c6be6e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'viewer', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 22 framework org-bindings
  -- ============================================================
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('61f3ae70-f722-5b86-84d3-64a6d0e0026c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC 2 Trust Services Criteria', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('3350e308-9a22-5a55-8ee3-32236ac5f9c6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO/IEC 27001:2022', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('064d21d0-ac25-59fe-8946-393961b2dee0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO/IEC 27701:2019', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('9ac5de22-d674-5267-82ae-72667182c6a4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO/IEC 42001:2023', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('4cab340e-beb0-5b54-8c49-6deeef264dfe', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST CSF 2.0', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('cecb5280-8bea-5cbd-8870-0c3be12954f0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST SP 800-53 Rev. 5', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('2ce2b650-2678-5bdc-80fe-89d42ab4dd62', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST SP 800-171 Rev. 3', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('93b94fbb-49c7-54f2-81a4-4825d630d4dc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST AI RMF 1.0', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('bd2fcf57-e1ce-5266-8869-2dd3a668f7d7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI DSS 4.0', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('ef9dfdd5-6ee5-54e0-8b96-0fc3cc3df094', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA Security Rule', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('8beac02a-7cc7-59b2-8589-16f8d66125d0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST CSF v11', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('ca560add-7cb5-528a-80ad-144d32ca8ebf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('ee96c2fc-5a6c-5966-837a-c48a167370f8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA / CPRA', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('8369440b-dfaa-5bc1-802d-e4f35bece0dd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('46cf9554-1f17-5da7-8c4a-0975711c9e2e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('6945544d-072c-55c4-86cb-b9e96de613c9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU AI Act', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('ae8dd9c0-98d2-565e-8605-594fc29bd6fd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS Controls v8', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('d70c685f-3e77-58aa-80f1-6989f6dfaf7d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX ITGC', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('2f900b03-f2db-586c-8f29-58b98d9f4c48', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC 2.0', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('711aefec-d937-5f13-8b8c-5541567d7c49', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FedRAMP Rev 5', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('1755997c-94e0-5cad-835c-09129a4a088c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO framework_bindings (id, org_id, framework_slug, framework_name, scope, created_by, updated_by, created_at, updated_at)
    VALUES ('f9d0c901-3923-5ed2-85d8-af6229d8c0ad', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ffiec_cat', 'FFIEC CAT', 'in_scope', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 150 controls (≈7 per framework)
  -- ============================================================
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('727de91c-1ace-510a-85a4-4fea26eef730', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-01', 'Control 1 for soc2', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('563f63d6-a11e-5c9a-8d4f-cf0c1f172454', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-02', 'Control 2 for soc2', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3e627f54-29bb-5633-8b3d-cbb208507df9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-03', 'Control 3 for soc2', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3c38b584-4984-53a1-8c35-380f80876bb3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-04', 'Control 4 for soc2', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1110cc84-1df3-5047-818f-a75f2323ae29', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-05', 'Control 5 for soc2', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a78d788d-49d3-5200-8a38-45c0144dc24b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-06', 'Control 6 for soc2', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0faa4b3b-3359-5a0a-80c1-7d21a33a7b36', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'soc2', 'SOC2-07', 'Control 7 for soc2', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fec7b32c-a804-5a25-860b-5a4699f0fab4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-01', 'Control 1 for iso27001', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('cfc030ff-8209-5590-808a-fe4ee32cbb22', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-02', 'Control 2 for iso27001', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4bbaecd1-2736-599c-80e8-f5c6f34d38b9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-03', 'Control 3 for iso27001', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ed37453b-acde-5673-8ba8-1264aef093f7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-04', 'Control 4 for iso27001', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('51da5ee8-fba8-5313-894e-27336aca5012', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-05', 'Control 5 for iso27001', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('baa7654a-1e2f-5d12-89fe-81148aa24772', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-06', 'Control 6 for iso27001', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ddbc0fe4-a4fb-5aab-82b1-bb5d330b1ce7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27001', 'ISO27001-07', 'Control 7 for iso27001', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0dc6acc6-c9dc-5a5b-8892-02302939103e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-01', 'Control 1 for iso27701', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d1d5134d-73a3-5845-88f6-de009a73abb1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-02', 'Control 2 for iso27701', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('041bf44e-c51e-54c5-8270-5fb09ef7fa96', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-03', 'Control 3 for iso27701', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('167b60b9-92f6-5050-8fcf-942e10d06439', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-04', 'Control 4 for iso27701', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('127e703e-128f-571d-80c1-58eca632f824', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-05', 'Control 5 for iso27701', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('875bcb18-2868-50bf-824b-b0e6398ea8c5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-06', 'Control 6 for iso27701', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('6f8202d9-bff7-57d7-8c67-e26aba5cca8e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso27701', 'ISO27701-07', 'Control 7 for iso27701', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('7832f531-cea4-5369-8e5e-2b037629b5e6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-01', 'Control 1 for iso42001', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f9c9fc1c-5f81-57b1-8c08-43889c1f721a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-02', 'Control 2 for iso42001', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('67966530-a7ba-5160-833a-1e144826b3e0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-03', 'Control 3 for iso42001', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('bb0f7157-ddd3-596e-8a86-18ab0d7c51f5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-04', 'Control 4 for iso42001', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b9f95bff-6806-5b49-89f8-9fc9a829c350', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-05', 'Control 5 for iso42001', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('2f4cf687-9ec6-5dcd-8328-221430e0eb4d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-06', 'Control 6 for iso42001', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d6a8a307-53ac-5174-89f1-f941a50bcb81', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'iso42001', 'ISO42001-07', 'Control 7 for iso42001', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a65bd57a-a7f7-5a62-8ed5-b5648208558b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-01', 'Control 1 for nist_csf2', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dcb93ff7-e76b-592a-807f-18f613b94ec9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-02', 'Control 2 for nist_csf2', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4726a445-f351-5775-8e2f-0cb889480731', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-03', 'Control 3 for nist_csf2', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('2a37d6cc-f059-5958-838b-e16026912f03', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-04', 'Control 4 for nist_csf2', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('65e69547-72d0-5cc0-85b8-fc7e22af56d6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-05', 'Control 5 for nist_csf2', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c75196c1-d9cc-5e3f-8819-f027b9c2b599', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-06', 'Control 6 for nist_csf2', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f394b5ec-8792-58f1-8251-fada3b340732', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_csf2', 'NIST_CSF2-07', 'Control 7 for nist_csf2', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4b64bc8e-1cd4-50ef-8b56-2fc88a1745ce', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-01', 'Control 1 for nist80053r5', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dd55eb09-4785-5f02-8b1b-cf910eb12fbe', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-02', 'Control 2 for nist80053r5', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ba505447-b71c-5c89-8a39-0fd88037e6d8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-03', 'Control 3 for nist80053r5', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('e9c4800f-2e99-56b8-87f2-8e1dca1a84c0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-04', 'Control 4 for nist80053r5', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b681c3c2-67dc-57c9-816a-037605096940', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-05', 'Control 5 for nist80053r5', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3d9e1fd3-a5f6-5e13-84ad-99c43fc2953e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-06', 'Control 6 for nist80053r5', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ad4a41b0-ddd3-5f7a-8f9f-7161f8a80133', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist80053r5', 'NIST80053R5-07', 'Control 7 for nist80053r5', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('45d3e55a-9e13-593c-8aaf-91d58d8c5db5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-01', 'Control 1 for nist800171r3', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5b57688f-e1ce-59c8-8a4d-2615497360ba', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-02', 'Control 2 for nist800171r3', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3c223b7a-e46e-5ed4-8325-c432aef7270b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-03', 'Control 3 for nist800171r3', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('376515cb-0c80-5ac2-8b1a-335d90925fd6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-04', 'Control 4 for nist800171r3', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0f682285-ad4d-54e1-815d-2ecc7f13a5bf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-05', 'Control 5 for nist800171r3', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('29a759b9-f076-5c15-8359-b118fe11fe10', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-06', 'Control 6 for nist800171r3', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4b100de0-10e1-5d7f-83fe-f08419a3ad5b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist800171r3', 'NIST800171R3-07', 'Control 7 for nist800171r3', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('11e81e3a-f1b8-5196-8e00-c82d1dc714b2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-01', 'Control 1 for nist_airmf', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('167a1083-7ee7-54b1-8eab-8bfdf7357c98', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-02', 'Control 2 for nist_airmf', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b665b9cd-66c6-5281-8968-560890ebe005', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-03', 'Control 3 for nist_airmf', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('04ad5136-c743-5a46-84c8-a1f01292dec8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-04', 'Control 4 for nist_airmf', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('18319716-66f2-5957-810d-f38806e0647b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-05', 'Control 5 for nist_airmf', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f5eb9182-1774-58da-8d43-59cacbc8fbe5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-06', 'Control 6 for nist_airmf', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d6c3d38b-4cb4-5d75-8fc4-44193fa69179', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'nist_airmf', 'NIST_AIRMF-07', 'Control 7 for nist_airmf', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('2c2e2ce8-704d-527b-8baa-8baf6d396b92', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-01', 'Control 1 for pci_dss_v4', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3c1d4227-1784-5374-8506-cd4296400f2e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-02', 'Control 2 for pci_dss_v4', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('688c60a9-4440-538f-8187-f3c907cd3218', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-03', 'Control 3 for pci_dss_v4', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('066ed2bf-e0b4-586a-840f-4d13d7012acc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-04', 'Control 4 for pci_dss_v4', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b7e0688a-4d3b-58fe-8a6e-dc7fa697baea', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-05', 'Control 5 for pci_dss_v4', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('7ca9d680-06f3-51c3-8f61-b81fa26ee410', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-06', 'Control 6 for pci_dss_v4', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fca87006-f987-5230-8cac-f51e4b18c1a8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pci_dss_v4', 'PCI_DSS_V4-07', 'Control 7 for pci_dss_v4', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3035df53-63b4-51dc-8d67-03b4c05531c4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-01', 'Control 1 for hipaa', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d47aceb4-99d1-52a3-85e5-c83d9490a2e8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-02', 'Control 2 for hipaa', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('27024d78-7c79-5557-8b5d-a1bbf13c6370', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-03', 'Control 3 for hipaa', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5b6cb96c-83e6-5084-87d6-8d717be6cad4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-04', 'Control 4 for hipaa', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fcc1b17b-6074-59a9-87d2-8663127a6106', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-05', 'Control 5 for hipaa', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('47d249c2-f74a-554f-8f2e-0d2c2fcb9b0b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-06', 'Control 6 for hipaa', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a33b165a-1507-5c54-8e76-e8f60df0e8ce', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hipaa', 'HIPAA-07', 'Control 7 for hipaa', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1807c848-b01d-59a0-8f3b-39235075ddbe', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-01', 'Control 1 for hitrust', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('32a54d4b-5a79-5246-8bf8-82fc4b39ec6c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-02', 'Control 2 for hitrust', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('7a265fef-10c5-5883-829d-de6351730411', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-03', 'Control 3 for hitrust', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5158da39-4931-5f58-8b67-85fd7a9c9643', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-04', 'Control 4 for hitrust', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f8945a3c-e202-58fb-8de8-33af60009113', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-05', 'Control 5 for hitrust', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1c921007-f259-5334-8bf4-095a800768e0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-06', 'Control 6 for hitrust', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b0860113-d5d9-5cc4-8b89-9b454c56f175', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'hitrust', 'HITRUST-07', 'Control 7 for hitrust', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c780ff08-9489-5da9-8af6-615dabc0147b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-01', 'Control 1 for gdpr', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('26f9277f-c440-56da-8a67-95fb740735dd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-02', 'Control 2 for gdpr', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1493b8cf-d3f5-5e99-8973-64f8ca3bca83', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-03', 'Control 3 for gdpr', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('73105f28-3120-556a-826e-ab9acb005ba1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-04', 'Control 4 for gdpr', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('75091f4d-43e1-58d5-8951-e118f20386bc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-05', 'Control 5 for gdpr', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dfb5852e-a499-5cdb-8fc5-aeb321d029ec', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-06', 'Control 6 for gdpr', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4e86f259-5592-5272-8668-b1549deab1e1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'gdpr', 'GDPR-07', 'Control 7 for gdpr', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('58cfb7b0-34a6-50cb-8c00-317d1e8fd4f2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-01', 'Control 1 for ccpa_cpra', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('94b6e6dc-39b0-5d01-8bb7-ae6cb85f3809', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-02', 'Control 2 for ccpa_cpra', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b432aa02-1f38-52ff-8776-4856e647f3bf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-03', 'Control 3 for ccpa_cpra', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f11ba2e3-ae28-520d-87aa-6bc07a9f3a23', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-04', 'Control 4 for ccpa_cpra', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('6b6705f3-dc8a-550a-8f43-4c048385dc0d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-05', 'Control 5 for ccpa_cpra', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c89aa5a0-431c-5520-8687-343f37d03c91', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-06', 'Control 6 for ccpa_cpra', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('922dceff-cb6e-5041-86c6-8a8a1b3e6375', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ccpa_cpra', 'CCPA_CPRA-07', 'Control 7 for ccpa_cpra', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c7f4453c-1f1d-51ee-8dfa-a3220137f88a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-01', 'Control 1 for pipeda', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('be0d58a4-5259-552a-83c0-c28af9f67841', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-02', 'Control 2 for pipeda', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c7fd5097-6ebd-5c49-8aec-6f67a2e3642f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-03', 'Control 3 for pipeda', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('7687e3a1-6e7a-5d94-85a4-66253f061aec', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-04', 'Control 4 for pipeda', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('6f319c5d-5994-5150-8019-8313cf03cd88', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-05', 'Control 5 for pipeda', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('19330740-b13e-5b96-8bc6-14b740aeb7b8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-06', 'Control 6 for pipeda', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('34187164-aed1-5561-8f98-3427997b4826', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'pipeda', 'PIPEDA-07', 'Control 7 for pipeda', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a0fde164-e3a7-51c9-85b1-7e99e2dfda3d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-01', 'Control 1 for lgpd', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('caf0d5cf-7d76-5dd3-8c1e-6374badad2ed', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-02', 'Control 2 for lgpd', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dff9dd76-6a80-5fcf-8fbe-4ad231fa9e7b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-03', 'Control 3 for lgpd', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('365da2cc-05c5-5c91-83dc-d119a577261a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-04', 'Control 4 for lgpd', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('195199de-6b06-5f15-89a7-04b480ae5605', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-05', 'Control 5 for lgpd', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('e6d6a195-a3ce-5e5d-8116-75ddd56676c9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-06', 'Control 6 for lgpd', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('69f75dee-ee89-5187-8f3c-98c50493a10a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'lgpd', 'LGPD-07', 'Control 7 for lgpd', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('bd863bfa-145c-55ef-83b6-7334b4f1f3a4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-01', 'Control 1 for eu_ai_act', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0e9ab416-08e2-50f2-8dfc-dd6712e482c6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-02', 'Control 2 for eu_ai_act', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('83382110-8d79-5c16-8cd9-1bc93bbca4f3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-03', 'Control 3 for eu_ai_act', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('483008ab-0f41-5bf6-8bc2-428abb6a3d51', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-04', 'Control 4 for eu_ai_act', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1af861de-7dbc-5c35-8f40-f59dd5f1e297', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-05', 'Control 5 for eu_ai_act', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fec0a6b2-4db7-576e-8a4c-b6087022086c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-06', 'Control 6 for eu_ai_act', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0c2837f5-b278-58e6-84f3-3b964bc57d75', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'eu_ai_act', 'EU_AI_ACT-07', 'Control 7 for eu_ai_act', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('100dc37f-52e1-598e-86c8-0f83ae617bf0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-01', 'Control 1 for cis_v8', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('e62d290c-7d01-527b-82e9-602b78a0c7ef', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-02', 'Control 2 for cis_v8', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4f709187-fd28-5849-8adb-130b7fc3bfa5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-03', 'Control 3 for cis_v8', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('2382fc99-c88a-5e6a-83f5-bb0130c347a7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-04', 'Control 4 for cis_v8', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('26c69cc6-f494-582c-8ca8-fc87077239fd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-05', 'Control 5 for cis_v8', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('8d651024-4663-5ade-8f36-63bbd113fae1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-06', 'Control 6 for cis_v8', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('9565b5f3-aa2f-5381-8475-c2b13793e146', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cis_v8', 'CIS_V8-07', 'Control 7 for cis_v8', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('532acc7d-e4b8-5573-8630-ede5a9b3658f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-01', 'Control 1 for sox_itgc', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5ebef47c-4ba2-5cc9-8cc2-cb46bcc1371c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-02', 'Control 2 for sox_itgc', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ea06e5fe-a67c-527d-8e14-0b7c3f2855f1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-03', 'Control 3 for sox_itgc', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b6a288d8-029a-598f-8a0c-f0cc806d4e9c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-04', 'Control 4 for sox_itgc', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('18e80c34-cdeb-571a-8840-d35c7100561e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-05', 'Control 5 for sox_itgc', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d93785a9-3f55-5d08-8dbb-2b50dd3d1bae', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-06', 'Control 6 for sox_itgc', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('27c98ee9-4ccf-5035-80b4-06766c719d96', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'sox_itgc', 'SOX_ITGC-07', 'Control 7 for sox_itgc', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('871ca2b2-6130-5306-8014-c4ecb9a38c21', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-01', 'Control 1 for cmmc_2_0', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5de0316f-2ee1-56aa-8e83-10e9bdb93655', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-02', 'Control 2 for cmmc_2_0', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b9e75501-9a99-5fa6-81cd-e83561ff4d54', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-03', 'Control 3 for cmmc_2_0', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c1d108b9-006f-5e20-861e-db3056f24874', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-04', 'Control 4 for cmmc_2_0', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('e6693acd-9350-5f48-830a-c2001082efd6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-05', 'Control 5 for cmmc_2_0', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4b7265a9-d419-535c-8a72-713b35fec5cf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-06', 'Control 6 for cmmc_2_0', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3904221a-32d8-5fe9-86fd-d815aedc84d5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cmmc_2_0', 'CMMC_2_0-07', 'Control 7 for cmmc_2_0', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('bff7c64f-936b-5716-80f4-0cea4a7a129d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-01', 'Control 1 for fedramp_r5', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('364fae0f-88c8-5917-8951-b92df73c1fc2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-02', 'Control 2 for fedramp_r5', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5ee93b74-57b9-5ad1-8002-c3f9caa82350', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-03', 'Control 3 for fedramp_r5', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('73a7f1bd-d948-5734-8e19-fcd77c6bc1cd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-04', 'Control 4 for fedramp_r5', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('03491513-7d34-5b39-83fd-349dc4838046', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-05', 'Control 5 for fedramp_r5', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c47b832e-0850-5722-83f6-4f8292570caa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-06', 'Control 6 for fedramp_r5', 'verified', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a1225da0-f2f9-5113-82cd-7819472c811a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'fedramp_r5', 'FEDRAMP_R5-07', 'Control 7 for fedramp_r5', 'not_implemented', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('59091759-6572-5dc0-8fb4-3ecd5f25ff13', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-01', 'Control 1 for dora', 'partial', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('232cda0d-14f6-521b-8d64-0f7f0749c927', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-02', 'Control 2 for dora', 'implemented', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a2de411f-1467-54d3-842a-be7dbf0d47ae', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-03', 'Control 3 for dora', 'verified', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f9449dac-a4de-5643-8dc8-eef8b741f10e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-04', 'Control 4 for dora', 'not_implemented', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('9087256d-4364-5061-8c36-02a8602b3615', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-05', 'Control 5 for dora', 'partial', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('31b99090-acf0-5486-8c2b-2fc9657d21c7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-06', 'Control 6 for dora', 'implemented', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('87d8ac3c-0dcf-5d4c-806d-7c8fd13c4bd1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'dora', 'DORA-07', 'Control 7 for dora', 'verified', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dd65229a-0d0a-5166-8a27-e9e8f59dda95', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ffiec_cat', 'FFIEC_CAT-01', 'Control 1 for ffiec_cat', 'not_implemented', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('8e07ea7f-84ca-5970-8bac-dccd589db797', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ffiec_cat', 'FFIEC_CAT-02', 'Control 2 for ffiec_cat', 'partial', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO controls (id, org_id, framework_slug, code, title, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ce8cbdf5-9dbc-543a-8bc3-b0b101e7ae80', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'ffiec_cat', 'FFIEC_CAT-03', 'Control 3 for ffiec_cat', 'implemented', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 120 evidence artifacts
  -- ============================================================
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('0744b7ba-3f0b-54cc-8b2e-a199df33f49c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-001.pdf', 'application/pdf', 10017, 'fa3f7f09aff96a186e59f57e2b35cb60ceefee51f641c067e9c30c0c40d0779f', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('05cb4c95-f4c4-55b8-8f39-8beb14f07886', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-002.pdf', 'application/pdf', 10034, '69cd67a49e4b6b1fabf700740899ce8a905d08202a5d110e608fee49b83a2ea5', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('0dc97926-5ef8-520f-8176-c5ecc2881e20', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-003.pdf', 'application/pdf', 10051, '1ceefc5ede665bc46fc307659ad645b5671e4f24c9f0bdc3f914e5100fd02d88', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('82a0ee9b-80b2-5fac-886c-57abf81d07b1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-004.pdf', 'application/pdf', 10068, '5e109249528842b4b40db85e4c04da9d41caf522bf024d1eba92429bd6f3f62d', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f6db3e94-c3ff-5177-8caa-90fb9c8da770', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-005.pdf', 'application/pdf', 10085, '05a443889c291444190ec5e1a32e2d1b0fc5ca41153ecf62e2fe686e8ed6105b', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('909600d2-52c4-50da-8d4c-ea0ed4002875', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-006.pdf', 'application/pdf', 10102, '3a1a038bad5f5daebe1670b39375cfe66d947be26eef5fc8fd5617aaf995268d', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('46bccf5d-e3d0-5a20-8261-825fc3c333a5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-007.pdf', 'application/pdf', 10119, 'ec2574c84de19eefdc2400a613fbdcf48dfbeccd99ef227393f4815fbe80abf0', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('b369fcac-8ed3-5185-855c-fb13d041dc0c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-008.pdf', 'application/pdf', 10136, 'ce7f2924a78d13d5457a2e544cf46c36fd9f21e5b3c8f8e6d0075d9e767856dc', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('abd76ce8-0816-5235-85f4-539927a90667', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-009.pdf', 'application/pdf', 10153, '0826b53a8b2991d0e88a879a05824d01f401db64f31cdda3712f6ca29e8855e2', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('84a376b8-2933-5363-8b51-1b7fc7d4fee7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-010.pdf', 'application/pdf', 10170, '410b1b5df405b2b2c990cb9aa985e7c8ded8a3ecb99cc3fb3b1d826b5a152d5b', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('2bbce9a4-eae3-53c3-8ff0-3e944bfdfd36', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-011.pdf', 'application/pdf', 10187, 'd508ba1ea27f3e90f31a38211819dc68d6f6c8ccc7e44f885595ef435b186690', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('a0aa0347-9c9d-59f5-86d8-ce2faa42e299', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-012.pdf', 'application/pdf', 10204, 'dde84f8be011116d6e0c6096a880e67503976e9b70dd1b23869d26f86610cd02', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('7c4fee76-88dd-5599-868f-c89bfd877f1a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-013.pdf', 'application/pdf', 10221, '25a13d406dde4473b3344c047069f65682109676c80e8ac2d83f6cca7c0ca4ae', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('a92de3bd-fbd4-56c1-829c-c616d2ad04ec', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-014.pdf', 'application/pdf', 10238, '3b04ee0809b53e1b196cd0040684bbe6c76788c25f3757229a574055140c715f', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('fdc311b3-b405-5ec8-8213-f7bc2f9d5dc6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-015.pdf', 'application/pdf', 10255, '435b4e55b9dc7e6a1f5ae44316bb8523c642ee9d2c1ff8ee409b28c182101f19', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('8715ccad-ebb5-58b3-8383-d7afcad122bb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-016.pdf', 'application/pdf', 10272, '17ff5f0b7ef768fb4a01ad2fdce0b6ef6e384e4b6499d6e72007fe055aa4a6af', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('5a2d2f15-eb63-501f-817f-ed77eae00151', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-017.pdf', 'application/pdf', 10289, 'ebdfad666ec75eedf2502420f3cc91d50f81086b885fb42b89adeee9ed6748ac', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('6d59dfd4-0d28-5771-8016-d2a02978a3ff', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-018.pdf', 'application/pdf', 10306, 'e85e8128ac1f04c5741e407bcefd1cb7f99838d8fd9bf37933deab0496929ef4', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('7fa50dd3-9ff5-597f-8880-6be0b7176f58', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-019.pdf', 'application/pdf', 10323, 'e1b9897e66ca0b8813931a47ed524bafe27b107382701e3fd5ff823cfeefac6f', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('ae17f600-7cef-54d7-8e76-b05f55bdf05d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-020.pdf', 'application/pdf', 10340, '3a976af9c91e180d7ccb05d06fad13bcf71ee6a8c83ba5a45332ebd39d3d8199', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f97abae0-9798-5488-8f52-499be64c18c2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-021.pdf', 'application/pdf', 10357, '4ad63e103479a64c54c64cae5e35a73cc43912bb5bbc0d7b0fed7b09dc12b6ba', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('47f2e51d-6d88-5c6a-8cb2-8ade9bce5493', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-022.pdf', 'application/pdf', 10374, 'a2a7bcf194b0b95dfcdf498c7ea79c02c5175e8c0495e7e27bec018f025c8046', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('d36daf56-1056-5b24-8268-f7f1cecef3de', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-023.pdf', 'application/pdf', 10391, 'f61725cdde9c4d8b4bce8620777ad2e9489b3019286748e4f103ab873cc28c6c', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('d1d8ca48-10f3-5a7c-8a3c-819a663a94cb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-024.pdf', 'application/pdf', 10408, 'af77880e1736ded5dfefa00a78c8a655c23a9352552347bb79565b738ac45c89', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('7f7b94f8-344c-57bc-8241-e061623c617c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-025.pdf', 'application/pdf', 10425, 'b014254c1649b081a5916b770bdf984d8319f137628f4607d539a6d8cf591638', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('1f1d2c6b-6c70-53f6-8acf-1a43bd9ecf52', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-026.pdf', 'application/pdf', 10442, 'f5a00073104336d99ad3f92f389d0f623c09a28d71617134c48f96cca760010a', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('4b2be499-34e4-5610-8e66-3528d8a25ed8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-027.pdf', 'application/pdf', 10459, '5fb382bfb7147abe4cd83f4ec80f31914cc743d618c4cf09b799ea32747bdfba', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('84855367-60d8-58ab-8867-304c975d026f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-028.pdf', 'application/pdf', 10476, 'ed592cf25dc115d28db9ab92423767b862efcf8b990bf7f506072d1e1ac6fa11', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('183d096d-f774-55f8-8d46-cd08e7dfa7d1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-029.pdf', 'application/pdf', 10493, '4eee68f5dfddd33201d734b3307fce544093aaf51e12c934a5561b8c9b4db677', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('d25343cd-5842-566b-8039-fb754bf3237b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-030.pdf', 'application/pdf', 10510, '102ba69d286bd3183f1fe9e37a2a5b68b3739919aac1644c342d19bb7a0d7316', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('dc0f3455-e433-5b02-8738-8a86b9d7f35e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-031.pdf', 'application/pdf', 10527, 'edee0f1cccd69c5b48d83e609ee44a13388c4319d16c4c77404d3c9fb7cec390', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('dc4e5bb1-3c7f-5858-891a-1da20928ffec', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-032.pdf', 'application/pdf', 10544, '01470240f76fda3fea4168357c6c6584c9c9b7a2ca290cb2953084d98c315133', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('261ec3b4-bd8e-5807-830c-29c3bfea7ba8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-033.pdf', 'application/pdf', 10561, '905f41fda49e46e168a1dd5e32c18bedd0849424519f957ff324513107270928', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('54b4c0b7-75be-551c-8aef-276e2c6f90e5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-034.pdf', 'application/pdf', 10578, 'd9d406f3939470cfdffbd0f2c0ed85e035e3e22dceae80fb49a733c78e38342b', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('fed3384b-5507-54db-8147-5608cc1a56fe', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-035.pdf', 'application/pdf', 10595, 'ae73173cb323c83c21c84c775de0a0e466ea3b42a4d271111e6ee215f1dd8d62', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('6b2e28e4-6c8b-5bce-80d5-47dee1c1be10', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-036.pdf', 'application/pdf', 10612, '02e7bcf0c9dc9d6c076777c94b9c5c800ac585ec8e90c9d6ca450c034ccd0bca', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('b1d65c4b-c822-57db-8466-e39d2f34dbaf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-037.pdf', 'application/pdf', 10629, 'f3fa25a54299df808e5d17628d8b7605edcd28c1bea2491282b18a03aecfd344', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('5b2d2212-bfdb-516c-8b38-e44a3fbde6c4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-038.pdf', 'application/pdf', 10646, '3f346001d24ffce6bed2f7bd90b8da6e647811b880364b3f376ad242397e7d93', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('514bc669-084e-5e10-8e42-0b036de34ed2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-039.pdf', 'application/pdf', 10663, 'c3fbdb561b1f191235562d5fb202fe9cbab506dbfdb5ebb05dc3bc77922ce31f', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('70523845-163a-573b-86ae-5dd951a05713', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-040.pdf', 'application/pdf', 10680, '7286db8e864c34ac241fda2c7ef4f13991d5aee98eb479f1857a1d05de0697d8', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('9ffa380a-1cd2-5de6-8ac9-dfdc538fde0a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-041.pdf', 'application/pdf', 10697, '3c89a7fb5e19e6379662d2e8e063d34eae47b1fb59af502398dfe2c8c896193f', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('dfcef47a-5e16-56a8-87b0-f00410663ec0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-042.pdf', 'application/pdf', 10714, '84658daeb0d8f5919cc6986665c8075b3a88791bbfb10d8e9221f6be9668d4f8', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('659b1dc1-18fa-5603-8b7a-deb15af51140', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-043.pdf', 'application/pdf', 10731, '5536b59dbd59062d5f0388a2805275fca365400d119b3c94f4cd83844013cdb9', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('01780910-4ea0-5247-842a-0dc743a61900', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-044.pdf', 'application/pdf', 10748, '067b62210b62dc57ef50bc559d6020a31f4cbc0a0087e7f4eb9b2930de228bec', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('a77547c1-5d06-512b-8c0f-069c46599195', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-045.pdf', 'application/pdf', 10765, '5a757416815984ec1113454259b9088ff30563ba3627374e7ddcfdd355f31def', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('4332385f-840b-53f1-867c-5c1b188b80b1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-046.pdf', 'application/pdf', 10782, 'e7706436195925753e76654b03d3e5bcce303fdb231bdf3a089b54c94df8bbab', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('ce33ad0d-19e9-5f6c-88cb-03c59acc5b7c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-047.pdf', 'application/pdf', 10799, 'bd41c3de152ddf50cd0961ceb32f700b64e48d87b226619d1e90a57725b90304', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('7ce9a412-c2e9-5350-8a83-002a4b285c1e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-048.pdf', 'application/pdf', 10816, 'b0e5d09512a9d7ce16617b4218b84ec43eb5bb148a66a68b39acb09503f86523', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('4f7594c7-9d6c-5edb-8266-7d45525563d5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-049.pdf', 'application/pdf', 10833, '4448514e9f3b9bdff2976ec776c6de398df7957e680e7e33efd245f70ee60798', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('bbe816e0-d593-5d1f-8681-ccc7200b6d98', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-050.pdf', 'application/pdf', 10850, '0b3b35c5074ceafc4eb1a08c70d2094a03352a86cd7a903610ac7274c26a3665', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('2745a7a8-5238-59e1-86d1-0bab5cbd00a6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-051.pdf', 'application/pdf', 10867, '98c096c4f654f29cf9022fa6822f83da8dc247a16aeb4d6e22640d8a37c5ed70', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('b0d51921-7861-53f5-8169-cfd474b1570e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-052.pdf', 'application/pdf', 10884, 'd0d87edf0ac5539497789fdef1b16b2860dac21efbf01e2ac5638224eb52e80c', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('d4ce3d63-1ad2-5971-82f4-0bce497e2628', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-053.pdf', 'application/pdf', 10901, '47a08e11fa25676bf5ef1bba6c17af07f7a06c42c509d02d4e1ff0fe16909377', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('59c20497-6219-5ddb-8df7-7bf932cd649c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-054.pdf', 'application/pdf', 10918, '207aa6104c08939a6da35248df0be56bb33860721c945aff8025d0d0ed621aa6', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f6953307-80e7-5dbf-82cf-1e078d51caf8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-055.pdf', 'application/pdf', 10935, '9a150b7083fb1c9d5e792c57b2409b63052be958b9e075dcee305668e774788a', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('e3ba2a12-f815-5e4f-8d01-980204a10c61', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-056.pdf', 'application/pdf', 10952, '54e4ef17713cc33775a2e3533c4810cbee849216ab0bac5fac17f6842fb80a2f', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f0f1ace5-6875-5695-85cd-3bebbde43c94', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-057.pdf', 'application/pdf', 10969, '642b650868e6931b07bb8dee601d468feed42a29e2e6bde81630dc3da45cfe04', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('e01ff347-20c1-52fc-8819-a31c79eb0489', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-058.pdf', 'application/pdf', 10986, '1c40a1d65b9510d87f0356029e77e9e049d1982a7f2e70b555edaeea34dc629a', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('561e76c7-877b-5447-857b-96a7a35205d9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-059.pdf', 'application/pdf', 11003, '78d292bf45b2b21294fc635624e473eb2116b1fa4bf076a5a2df81b518e12864', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f0f5ea85-5b1d-5cc1-8e79-1290e03ea846', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-060.pdf', 'application/pdf', 11020, 'ab12198a245f194e2acff9a5721580b8ac96e1dcc76991c962ee0b9466e3c9ac', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f56de145-4abc-5742-8c25-269bac2e4ade', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-061.pdf', 'application/pdf', 11037, 'd60220eb8abf9ee583e7e7d8ec3f2b43b212ce6c2b8ba75cfea7ac91029a1df0', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('e1d5631d-926c-50ba-8921-79b650a3ffe3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-062.pdf', 'application/pdf', 11054, '11163f4033ccfef835ab6f9ae9af0e43d78682c649549999700b52328979dfa8', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('d779bb64-aa64-5b2e-8b7e-abbf6ce96688', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-063.pdf', 'application/pdf', 11071, '6234810f8d85674d520a6f2561fabac13b906bec8c2d45ef7d9c20e6dbeb52aa', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('a47c6ae0-f9d2-5ee0-8565-f9384cff64f9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-064.pdf', 'application/pdf', 11088, '51462baf3ca0b49455c232ab40ec7ded57af16c5cc9a765b43909b0b9546435d', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('68a5c71c-c3e5-55cd-84e9-3c8346a7e0e0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-065.pdf', 'application/pdf', 11105, '1b629cc5693f3a6c5daa5e56e9d0b59a85a00e5f3353fca2026c5afa70eed4c4', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('c95fdbb2-0323-5db9-86e0-bb07d75979da', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-066.pdf', 'application/pdf', 11122, 'aad71658b885948dbc574a1c3df5d2ef5842359e45cf1c71fdb8c9a0b9a86240', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('5dac17e8-b258-5b9c-8146-899a04f7928b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-067.pdf', 'application/pdf', 11139, 'f822f8a5e639a06dd91b98ffe43cfb1f73fc919fe8e624a9fd25d71a93a75b2c', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('04ca9a78-53c0-50b8-80a3-5be6099c9447', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-068.pdf', 'application/pdf', 11156, 'd7155805fbb4ecf58f27e1225bc1fb4c790cdd133f83561d7b8044e9712b883e', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('71ab3fbd-7730-53cb-863f-37af7f9af750', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-069.pdf', 'application/pdf', 11173, '218f65bdac2a3df4824287cf5563716d0b545b5fe5a2853330e705ab6fe1fa7d', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('af498575-176d-539d-8303-d9ef2ff65879', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-070.pdf', 'application/pdf', 11190, '9db33a4247d86f6b14c4cf617c132427733b5ed7c217f3613736bd5b47b89e05', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('18fe03ef-da55-532d-8d72-990a5c19db07', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-071.pdf', 'application/pdf', 11207, 'a42e74c2efc401485d21b8cb4ed6e8dda38cafd972f1400ef05c0214e2f83a85', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('4f191f0f-e407-594a-82f4-b13340748b01', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-072.pdf', 'application/pdf', 11224, '15d4a8c1d709d58a4ae438047e4c8dd62c3aea2e8ed613cdc5324dce8665e092', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('7205a415-c98c-5486-83ab-f4891d2f2fff', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-073.pdf', 'application/pdf', 11241, 'c2092a0752e83b5b575cc8fd51b02f96be726bfa437c97740f0e6725ecb703e3', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('2b9bf89e-06bf-5537-88ad-a01b2b658cd1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-074.pdf', 'application/pdf', 11258, '4aa15d8fc51c89bb01ae0adbbb1a6806cfa51d731df5bda1c707db73208c0b8c', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('da3fc39b-81b8-545b-83bd-4590de5e63bc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-075.pdf', 'application/pdf', 11275, 'fd1c6a8e17d3a333418391871395fbcb01b10ebc738ff5b3e492f1de28e035eb', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('fbc8c638-31e6-5ec9-8e21-6fe903483cbc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-076.pdf', 'application/pdf', 11292, '0248c3d4911510567541eeae98ea3ee7cdb35b414c5fbc0ce57b06601772dc06', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('85c597ac-c17d-5034-83c6-16a0b1d3feb6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-077.pdf', 'application/pdf', 11309, 'e7e904f77e6619431aa91d8f147214a12a6220dfc132d0dbdc33a1d38813a7b4', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('faca234c-6495-559c-8d43-bbb1aaaef4cb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-078.pdf', 'application/pdf', 11326, '1116811b9d3e16d5b8bd4bd6d186e57072a97a1f0e7d99649d4a1a9b0c0a8b3c', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('c52dc11e-1d66-5c3c-859e-455c08dc50d3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-079.pdf', 'application/pdf', 11343, '517b7cc042e7d992d7e3f809661a24c472d695dc868561e59d905c9be7fafe11', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('8fc8e372-a23b-5b66-81a6-78bd5f2224b1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-080.pdf', 'application/pdf', 11360, 'b38158ee9fb3d1a72e08f42c984477823407a0fa7c72912bee66e62c4ce92629', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('445b56f4-419c-5511-88e7-071700509ec0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-081.pdf', 'application/pdf', 11377, 'dd7b1ce3c56e5f2faf68e9180938b266d7cda4ba0e14d417819aa70f22ce32ba', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('31cf1d7a-ab9b-54f2-8af1-cded2693f7cd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-082.pdf', 'application/pdf', 11394, '9843776493feb550c28fd4c734ea3204ba94afa6d63f207017cd6d1321b5798c', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('08b9a3e5-a2f5-5123-8e7d-273455d848ca', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-083.pdf', 'application/pdf', 11411, '35c4cdee405dd4ffcf5f9f8448fab2053fe60ca64f18abae2ad4bbba647df309', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('0554a268-a144-5f07-8796-10ca0a6aacf7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-084.pdf', 'application/pdf', 11428, '4fc9e378f1abad04ecc48c01c2d553cffc7f9307b5f509d7e0eb44cb79c4823b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('bd19b561-65a1-558d-8f9f-1f2d1d02682d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-085.pdf', 'application/pdf', 11445, 'a82f18190d2813114bfe617ac104df9186a0edd754472ab0265282684d1154e1', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('0adb1d5c-08c9-5eea-82e1-dbf0112c9a13', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-086.pdf', 'application/pdf', 11462, '7a5adc3b6a79d6d8ad338e69d1bfdcf5a5c2a9e147ac4144d529a5f93d379b44', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('257a4ee5-c0ab-5432-859f-d65cd9d0434c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-087.pdf', 'application/pdf', 11479, 'cf484bf4497ed74936f76eb6054c8a5bb9042124e31155bfad762c8e0d1cb0ac', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('166e0867-a042-53be-8685-f464a88d817f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-088.pdf', 'application/pdf', 11496, '56dfc9b00abc552bb14b3358315518f838f9d100ae62fe6ae76eeb9624b47fc2', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('4f911647-82b5-5bce-8b81-a3ff2117ab51', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-089.pdf', 'application/pdf', 11513, 'ae27fbe89bc37527a8fe8e44dc53780d05a47cea834fdb4131191b23d2031b8e', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('6e9c6317-c383-5fa2-80cc-ac22b40945fa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-090.pdf', 'application/pdf', 11530, '0f26a91b9096aca378321259338afa169d3d2eba16593005bb9f7e8b47b7ae7a', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('0a9ea058-e9ea-511c-8a60-e8a933bfe01c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-091.pdf', 'application/pdf', 11547, '7f92e3dfedea3368e5d445912ccc8937b9809a5cbdcb7f2e13855e5df32da02c', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('81c26bbc-036d-511b-8e23-46998a2cda66', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-092.pdf', 'application/pdf', 11564, '38dd60182260e971dee5d985a3350f31545f113b25e288170a379450392b4b17', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('9ea5a43d-d495-52b4-8587-2a75885096ac', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-093.pdf', 'application/pdf', 11581, '82ac54e65db54c387f75ea55161f3bc061837a25fb44dea1d5c708a47a0c0bd5', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('f75520d9-f7e6-58dd-8a91-95c595116d6d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-094.pdf', 'application/pdf', 11598, '514ab51ccb4be9e60a9f06b3f58082bf93bec1eaae248e880209faebf32a9832', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('36a3991a-7a97-5b77-85fe-ade5fc5b419f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-095.pdf', 'application/pdf', 11615, '966dfb3412f39356ea2c8d0d726b288134d4877a8448637f9699e1dee575c378', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('7541d8d2-ee7f-5525-8cc1-18d816a519b5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-096.pdf', 'application/pdf', 11632, 'acfe4656ef0b4bc8b0191acdf177cbc80be06c80cc0988d0a3e0352277340713', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('df4aa0f6-e6ee-5e33-8e42-997a5fa17976', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-097.pdf', 'application/pdf', 11649, '2bb23ebc4ac9885c78a7c856d043981301bbccad5b73bf67bf01e53417192c2c', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('b7878b14-287f-5778-8e7d-705359940706', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-098.pdf', 'application/pdf', 11666, '22cbf7ef565fb5ca1b72e7a83bf93deef8db3815e238ce2f59b739cc28b8e107', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('ee8c8824-c5ef-5536-8c00-183fb04c4f17', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-099.pdf', 'application/pdf', 11683, 'e9c077353cb8574ac10570e4a882a2b20a3d7aa7d23e06b704a9b03b1090198f', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('505db64e-10a9-587a-8562-8da12daf5d5c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-100.pdf', 'application/pdf', 11700, 'f043a5a6f3ef3f19c2b025ba416df3b8c8a9c1489fb0169621052c5197c0b15d', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('08e342c2-eed1-5219-8a57-c83f370d7465', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-101.pdf', 'application/pdf', 11717, '76c74a52f128ca18bdc99a5d158b2a105c6a784b939d8b024658437273bfd072', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('e92cbb7a-3e41-5af7-80da-2fa0fcc0ff90', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-102.pdf', 'application/pdf', 11734, '6aacc160105fe1de802ad798c5f1416998f1423a25bae6d2f69253125c8ecf2e', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('fc3f43b1-5136-50e8-8bf7-b8ac1d277969', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-103.pdf', 'application/pdf', 11751, '080f05c03a79ff98a1cfa2cb7c94f02fbb8530ea95129118ae13400bcf4b15cd', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('1638593a-9448-5c69-8558-add7878a924c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-104.pdf', 'application/pdf', 11768, 'fb1ffa6a3b026b2f6900f2efd31f8c4850c2aa2e1da342fbc94d22efb3c76d31', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('4d51bc81-e542-5868-88f8-fc411a3547d6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-105.pdf', 'application/pdf', 11785, '05e4523a81e2de8abd91c8d72f6b00b1c9271aa01516f7794b85aba34b1f84f4', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('384b82d2-9d3b-5f4f-84e4-27905618d5d3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-106.pdf', 'application/pdf', 11802, 'aea2b16f794344751144d56df76e8da0d57927a60ecbb209f17df84dd6f594bd', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('36fce553-5e6d-5d4b-8385-2132b77b677e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-107.pdf', 'application/pdf', 11819, 'af53e899297e9d7f52873ab27ffc6c7b34547234e6d1f01de451128fd39d218f', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('e02ef91f-dede-53ee-8514-3dccb3828298', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-108.pdf', 'application/pdf', 11836, '7d91081112d590270afd64dae9d0cff95356981695c819dc8d1772ed39280682', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('30aef675-66d8-56c4-86a7-6ddf601cca24', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-109.pdf', 'application/pdf', 11853, '8fad3ac0dfcaf1d1c0833eeaa1299b5c63bca86f3b8f61fead24dcde18467e9d', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('d0a18338-6325-549e-8391-e32b072ee350', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-110.pdf', 'application/pdf', 11870, '989a56fa8bd50fa62f51b4164e6b00fccd300202f4cc84c7276e9423147459d4', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('02a296db-be85-581e-842a-7810701e6b02', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-111.pdf', 'application/pdf', 11887, '4e05d99eb8824a4149cbfb1af1f0ef1bd0351ab7e55e816908afff8077305b25', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('2af1d17b-f7e2-5b41-8fa4-c2219deb4c71', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-112.pdf', 'application/pdf', 11904, 'c0a689d991b88166a4a3ed5fb17fd8d03fd00c6eff0518a2e85a58ab7cd41d6a', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('e5fbcf62-fc1f-5be4-8ab4-37fcacd5861f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-113.pdf', 'application/pdf', 11921, '1ee4637b6684c94d3a0a0c26becea63a0ae648bf2e3568a4558a3f4c9ed65ca9', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('1fa4e627-49a4-5325-8ebf-2eea231e8b43', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-114.pdf', 'application/pdf', 11938, 'a68500ba4d67c3eeb1456e5f315794728d3fda607e04f5239c3a7d503df1d372', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('ba3dd57c-7485-55e6-842f-cdd211eb20e6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-115.pdf', 'application/pdf', 11955, 'e9c89c598e3e948a1b09cf1cd945ef6a31bfa2a1648b980e21ab1330843ae3f6', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('2aaabef8-a883-56d7-80cf-a19c1f6a2caa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-116.pdf', 'application/pdf', 11972, 'e178986fe273a98ed1f0b2f9bf66b32bca4f1955880531977a180b2466a3b863', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('59a15871-0f43-5ccd-8848-84efc0dd35c6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-117.pdf', 'application/pdf', 11989, '54fdd28a0eb5db7e3a2c0f11203fc2f830701bb9afbaa30876a5b1c235fd0a94', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('701a2536-a6e1-5617-803f-3344ebfbe067', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-118.pdf', 'application/pdf', 12006, '04a018524b38e17e466aa90d3984b49dcc971a03cabeea52eb1024c9266e71f6', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('27180e3b-468a-5709-8b49-f5dacb6262c6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-119.pdf', 'application/pdf', 12023, '3334c2e0f7a15136188b983fef419a65958430ab633f0ee5f95ccf59a900c7f0', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO evidence_artifacts (id, org_id, filename, content_type, size_bytes, sha256, uploaded_by, created_by, updated_by, created_at, updated_at)
    VALUES ('ca02b77c-2b79-57d1-8e1b-53fa1b11e10d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'evidence-120.pdf', 'application/pdf', 12040, '5b2a1228834fc39643253f60c1d45632ada82e5a8a0a7932c52c39b7855b2cbc', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 60 incidents across severities
  -- ============================================================
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b3140b4e-3125-52f4-87b0-5b017ef90724', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 1: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 1), '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dd4ab04b-5fa5-5308-8645-287cdd986dcd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 2: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 2), 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('cf404fdb-c50a-5549-8073-550fdec9493f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 3: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 3), 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f4baeb7a-038d-5f43-8a5f-30da48be8cdf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 4: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 4), 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('02cc0f77-b38a-5504-85db-58d6e9b86283', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 5: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 5), 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d87aeb0f-bfe8-5259-8ee8-e28c505652f1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 6: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 6), '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c53865d8-4d48-50c3-8950-6835513dbdd3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 7: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 7), '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('eb00a9cf-1443-5705-86b2-bd7b2d17217a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 8: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 8), '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('cc9b84a2-9b52-525c-8b9e-2fc13ec0fafd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 9: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 9), 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('cfcfb9c9-e9cd-56f6-89da-9831544e782e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 10: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 10), '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4ec0c408-db10-500e-8b82-2a0fb9ad99cf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 11: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 11), '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('519a6410-7e90-5207-824c-0aabc500bd27', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 12: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 12), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5a0fa164-4de9-5247-84f4-7c9b258cc27f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 13: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 13), '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('bbf77a7b-6070-5cd1-8a65-4ea99a37f566', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 14: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 14), 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('31631cdd-a233-5c54-8b0e-1d91d8e7fd32', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 15: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 15), 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dc0f63ef-1708-5a4c-8923-7313f647843d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 16: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 16), 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('7f1b3f19-ae57-54c5-8ab1-2c74cf7b5bbf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 17: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 17), 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a69f4986-88bc-5e6b-8d9c-3c7879e910d1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 18: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 18), '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('53c70439-bdfe-5a47-8a14-1d306442b7c2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 19: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 19), '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fe6ed7ef-4b32-5c34-8cae-93746aa2e13c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 20: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 20), '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a21ca624-1607-57fe-8539-6bb0d86e11ad', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 21: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 21), 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('09091328-a4bd-55d5-81aa-bfc11b61bc77', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 22: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 22), '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('560b47ed-b31d-59fb-8a95-b72c46a7451e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 23: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 23), '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3916a14b-adb9-52cd-8e35-07dd84ecf8d4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 24: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 24), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a4418e65-eea6-5abf-8e3c-eec5bfa7e606', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 25: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 25), '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('efbc1bfa-e431-5722-845f-fec649284812', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 26: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 26), 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0f40fff0-7b68-5239-8de8-ca6638e53cad', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 27: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 27), 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b2531e27-4215-5a1e-8e4f-10a8ba1b44f7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 28: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 28), 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('018cf808-31c8-57e2-8bbc-b1fcc0cf1d87', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 29: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 29), 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0e8d2dc4-8387-51b3-820a-cf48e511c949', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 30: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 30), '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('14beb0d2-7893-59d0-8b74-096f7b434c9f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 31: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 31), '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('9eac3634-103f-5d32-8026-93f2e83f7de7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 32: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 32), '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a37a37e6-40ab-57d4-8209-24dc822d242f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 33: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 33), 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d0a5ef53-6952-5bc7-82f8-6bf6da131e66', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 34: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 34), '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('bf625396-2d6c-57ff-81ed-52bdfc4d8800', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 35: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 35), '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('24a239af-a44a-5f6e-8429-a6f0bbb044f6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 36: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 36), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4c4ba023-d521-5dc6-88e8-50de1d6b283f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 37: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 37), '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ce1e46fd-ef27-516a-8c44-17ebcb2a576b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 38: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 38), 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4c123b72-a00a-5443-8d39-ef581ba53b33', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 39: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 39), 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b4abfe22-e380-587f-8d19-8315dd2ff763', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 40: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 40), 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0e077e18-5a7b-5231-853d-25a4e894e3f0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 41: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 41), 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0b8c5c6c-8945-51f2-8430-9f65ae9855cc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 42: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 42), '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a7abf94f-5420-5011-8f7b-1e40a7f2da02', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 43: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 43), '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('339bc11f-cb6d-5405-8033-9183e74477b3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 44: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 44), '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c7c559c5-6552-5a20-84eb-8112602e8cc8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 45: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 45), 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('08a4ddfc-ad15-5814-87b9-a11c95a68139', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 46: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 46), '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d38eedce-48d0-5a72-8e4d-d0876ba1b939', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 47: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 47), '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4f9d600e-77cd-5b6a-8da8-4cc8552b6708', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 48: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 48), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('dd90ae6a-489b-5c42-8d8b-836231587a81', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 49: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 49), '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f41c12ac-7ef5-51fd-860e-4ef2e62ba26a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 50: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 50), 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('33740579-d7af-5d73-8f0d-76ff80ea8286', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 51: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 51), 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('852e72d8-b721-5c8d-891f-3b091fd4d92b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 52: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 52), 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a50c522f-307e-5fa6-8104-4411f90c73d2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 53: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 53), 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('39e77bb8-2455-5cd2-8c15-e6cb14c187ab', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 54: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 54), '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('54bb9bcf-5605-5803-86d1-affb4700186f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 55: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 55), '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b7a67dce-4812-5333-88a4-e38894fdfa46', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 56: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 56), '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d40276f2-aa78-5ed6-8261-f0cdc810b498', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 57: simulated sev2', 'sev2', 'contained', NOW() - (interval '1 day' * 57), 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('2b0485be-93f3-5714-82c2-ffffb331d54a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 58: simulated sev3', 'sev3', 'resolved', NOW() - (interval '1 day' * 58), '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('3a4f7ce8-763b-5b79-86bd-6bac0acd67f6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 59: simulated sev4', 'sev4', 'post_mortem', NOW() - (interval '1 day' * 59), '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO incidents (id, org_id, title, severity, status, opened_at, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('00f00731-a51d-5241-804a-a21b9f2cf584', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Incident 60: simulated sev1', 'sev1', 'open', NOW() - (interval '1 day' * 60), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 80 risks
  -- ============================================================
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b1dde5fe-be65-5d4b-82b9-ad8657cd84e4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 1: enterprise scenario', 1, 4, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('52de6f5d-26d6-5cfb-8db6-0cc992edd2f5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 2: enterprise scenario', 2, 2, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f66e80dc-856a-5d58-8232-20dd1b04bdd0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 3: enterprise scenario', 3, 5, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('449bd981-f9ff-5bdb-81f5-0fd2979dcec2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 4: enterprise scenario', 4, 3, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('8b0ff90d-56ac-5a14-8c90-584c9548cef1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 5: enterprise scenario', 5, 1, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('536a4aa8-fec1-5370-8847-269b4091981a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 6: enterprise scenario', 1, 4, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('aace01fe-6f05-53aa-8f67-dd1ca631f499', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 7: enterprise scenario', 2, 2, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fe08c4be-8769-52a7-8e8f-f51cefb6062a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 8: enterprise scenario', 3, 5, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0a07fc68-9164-5665-85dc-0a5dc4c81261', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 9: enterprise scenario', 4, 3, 'assessed', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('03792dca-5a51-5141-8e7a-5ae90ea090f5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 10: enterprise scenario', 5, 1, 'assessed', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1728621d-7628-5c85-8ac3-48aac9d0178e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 11: enterprise scenario', 1, 4, 'assessed', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('8231d644-b749-5719-856c-38d59a1ff1ff', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 12: enterprise scenario', 2, 2, 'assessed', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('e054f038-aab1-5614-87d7-1371e9c3836d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 13: enterprise scenario', 3, 5, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1e394831-6e23-53b2-8060-b41c7bd1db99', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 14: enterprise scenario', 4, 3, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ede455b8-5fd9-5f9b-8925-abd0b9fccc0f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 15: enterprise scenario', 5, 1, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('9f2e26d9-4262-51f6-8c4c-4a061850cc8c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 16: enterprise scenario', 1, 4, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c8c79e63-d931-5dd0-8058-dc9a415e8a79', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 17: enterprise scenario', 2, 2, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('168dec16-2c9c-5fbb-8aa7-e0157ae28495', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 18: enterprise scenario', 3, 5, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ccccfd5c-0702-58bb-8566-f530f1458adc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 19: enterprise scenario', 4, 3, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ad724fad-28da-5704-865e-70b8f1bb6fb8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 20: enterprise scenario', 5, 1, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('35baf9b1-d218-5c9e-8fce-879f0ae7064f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 21: enterprise scenario', 1, 4, 'assessed', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a24df393-6606-5592-84f0-5050831f5e52', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 22: enterprise scenario', 2, 2, 'assessed', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a420820c-3547-5680-8f30-322fec0ecda9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 23: enterprise scenario', 3, 5, 'assessed', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('5a4788c6-02fa-563c-87d0-acc7be58c1ea', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 24: enterprise scenario', 4, 3, 'assessed', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fc342bf2-a483-5187-8a09-505d922229ed', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 25: enterprise scenario', 5, 1, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0ab51abd-b775-5dda-85e3-981b4eb460be', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 26: enterprise scenario', 1, 4, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('64bb30b4-aa14-54e6-87bd-f2831a3f43b9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 27: enterprise scenario', 2, 2, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('abb4577c-4c93-5b95-840e-9d9dcb3f2e7f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 28: enterprise scenario', 3, 5, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('95632766-25a6-585f-8bdd-de80b55a62a8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 29: enterprise scenario', 4, 3, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('12fc7e41-c186-5f6a-8afa-fac335d1c526', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 30: enterprise scenario', 5, 1, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1b0d2271-dcb8-5ece-8d6d-65d46cb512a4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 31: enterprise scenario', 1, 4, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('c557ec8a-b4c9-5024-8bf9-c86b28bd50e2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 32: enterprise scenario', 2, 2, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('9f71357f-1d8e-5acd-8e49-ef34c4c1bca5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 33: enterprise scenario', 3, 5, 'assessed', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('e5ebc2d3-61d4-5206-81de-c85a3f4d8c13', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 34: enterprise scenario', 4, 3, 'assessed', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d3a7bea1-0c42-5556-86e2-0d9e37b5bc15', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 35: enterprise scenario', 5, 1, 'assessed', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d7b830ea-2e49-5eb3-8c4a-85ccf23983b0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 36: enterprise scenario', 1, 4, 'assessed', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4b2f1e5f-e825-5924-8eb3-14feae4f26ea', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 37: enterprise scenario', 2, 2, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ec009366-4c13-5972-8642-d0121f66c75e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 38: enterprise scenario', 3, 5, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('40e3a19d-627d-5af7-8341-684e2239e873', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 39: enterprise scenario', 4, 3, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0c28a62b-5f2f-5e54-8c94-6b3bb561c09c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 40: enterprise scenario', 5, 1, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('be6c7f31-e75e-5217-8f53-9b2709a866de', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 41: enterprise scenario', 1, 4, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('8bd4cb69-f681-5c42-888e-f6ed5d248da7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 42: enterprise scenario', 2, 2, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('304ad012-e311-5e31-8c42-4ef39d42c6af', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 43: enterprise scenario', 3, 5, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('cc9dc650-d389-5ca5-8677-fcbbac0aee4a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 44: enterprise scenario', 4, 3, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('20ff3210-8483-5c5b-8add-4841157df599', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 45: enterprise scenario', 5, 1, 'assessed', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0342329c-7721-550d-8581-b8191d313edc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 46: enterprise scenario', 1, 4, 'assessed', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4a016f7e-75e3-5c63-8ecd-09d3eb2351a0', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 47: enterprise scenario', 2, 2, 'assessed', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('fc08f6dc-5caf-58e6-861b-8bb49a04eb8d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 48: enterprise scenario', 3, 5, 'assessed', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d4cc00de-545f-5855-85c6-562239e43cbc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 49: enterprise scenario', 4, 3, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('67965b81-3c66-5900-826e-65baba398d73', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 50: enterprise scenario', 5, 1, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('113555d7-c8a6-5dc0-8e8c-9b068844b909', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 51: enterprise scenario', 1, 4, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('a9276cce-a0dd-54bc-8ab9-cd038018c2ab', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 52: enterprise scenario', 2, 2, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('80d1a106-740f-50dc-8a59-529767894255', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 53: enterprise scenario', 3, 5, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('bb8dc09b-a9ca-5461-8cd3-e5a75eeef8fa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 54: enterprise scenario', 4, 3, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1406d5e1-c6b2-5c38-8ec0-e273a1d369fd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 55: enterprise scenario', 5, 1, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('33a10df7-1631-53a5-88c4-73f67def8317', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 56: enterprise scenario', 1, 4, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('f5843bf5-d86a-5334-83ed-89233d1a6fab', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 57: enterprise scenario', 2, 2, 'assessed', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('b673f197-9133-5a49-8f6e-76a477c25035', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 58: enterprise scenario', 3, 5, 'assessed', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d65407ad-afdf-529c-8daf-94934164c4ad', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 59: enterprise scenario', 4, 3, 'assessed', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('4f5350ea-61a9-5071-8f87-6b32a64c8bf8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 60: enterprise scenario', 5, 1, 'assessed', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('677c5ac4-c53e-5923-8dfd-75aa26a5c636', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 61: enterprise scenario', 1, 4, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('6eabaab2-be7a-58bc-8ce2-20474588e002', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 62: enterprise scenario', 2, 2, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('db9384f0-b531-5352-8da1-324de3e67d2a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 63: enterprise scenario', 3, 5, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('46a81498-1856-574c-8cd2-ddb6149073d2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 64: enterprise scenario', 4, 3, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('d7a928d1-ebeb-556a-855a-e4dab84bc1ea', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 65: enterprise scenario', 5, 1, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('1ab7917e-35c4-58ae-810a-9b642d2c8780', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 66: enterprise scenario', 1, 4, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('2ee72bdf-afce-5f22-89a0-2e46b3c0c2c8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 67: enterprise scenario', 2, 2, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('8deddfe9-9af2-5542-8afb-d07132a8b1ab', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 68: enterprise scenario', 3, 5, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('09e523cb-44f9-58fc-8dd2-0af937e2391d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 69: enterprise scenario', 4, 3, 'assessed', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('aa56be84-d7e6-5857-85d6-67d5eb0f3e45', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 70: enterprise scenario', 5, 1, 'assessed', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('7a8fbbd5-6f98-56bc-836c-f841bf06051a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 71: enterprise scenario', 1, 4, 'assessed', '90712505-0723-5149-82e2-1d4ef2c6be6e', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('53d857d9-346d-546e-8de7-8a106862c864', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 72: enterprise scenario', 2, 2, 'assessed', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('175cb2f3-6284-5ac7-8396-ee20bc109dcf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 73: enterprise scenario', 3, 5, 'assessed', '580df925-7a7b-5145-85e0-e85f4f5e1176', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0bf4260f-3196-588d-8c7a-90c9b1c9982d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 74: enterprise scenario', 4, 3, 'assessed', 'f66ca424-df86-5428-83e3-2117045b6faa', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('6262cfce-683a-50fa-897a-5e926c410fa2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 75: enterprise scenario', 5, 1, 'assessed', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('873d450a-3e0c-5aab-8eef-407afb19f6a1', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 76: enterprise scenario', 1, 4, 'assessed', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('90924145-f570-5073-8a76-40dfd314162c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 77: enterprise scenario', 2, 2, 'assessed', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('ebeba511-a3db-5711-812d-5d198766e66c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 78: enterprise scenario', 3, 5, 'assessed', '4e303363-17b3-588f-849f-551b203f3e20', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('25915ecb-86cf-56b8-87aa-10c719f4e1ef', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 79: enterprise scenario', 4, 3, 'assessed', '540d259a-2567-5be4-8c82-cbc006cf1a5a', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO risks (id, org_id, title, likelihood, impact, status, owner_id, created_by, updated_by, created_at, updated_at)
    VALUES ('0b6b598a-fef7-55d9-8812-4ebba444eccc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Risk 80: enterprise scenario', 5, 1, 'assessed', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 40 vendors
  -- ============================================================
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('489a98e9-36e5-5a74-8d3c-99173e313a1a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 01', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('5f1cfe8d-b6d3-5971-8100-9a41c36c798b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 02', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('2e5d75dc-a6ee-536e-8bf7-626259f096d8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 03', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('627e0bc0-346f-5e6a-893e-ff2f780fc509', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 04', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('147f3ae0-575b-5a0d-82fa-06cb0c725393', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 05', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('61502207-a494-54fe-829f-3a2d8ce9725f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 06', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('c5a07476-b020-56a6-8486-c7bf36cbcb02', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 07', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('35e5c79e-b513-59b2-8b32-cd7da59e07fa', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 08', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('1f85db4d-d4c8-5cfd-8a7f-3ebfabb0282b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 09', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('c61cdfd0-6937-5a62-8e5c-6f8b9bcda0c4', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 10', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('73fc08ce-c33e-5973-8953-b06e6b306247', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 11', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('1207b1a1-3cc5-5613-8616-ea657e8f3519', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 12', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('593244b5-a04c-57be-8914-22076976eceb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 13', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('7c6a646b-c9b5-53db-8389-7ea37d4ea8dc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 14', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('047f4d61-a892-5a85-8f12-55ca7c43addb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 15', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('8d81cae9-0994-51c5-8554-54bb2b7d2b7a', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 16', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('d3b72603-625d-507e-8344-db83e4eed77e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 17', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('fa2a7990-a3c6-54ea-890e-b6881a3334c5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 18', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('b3d9ffb9-c28e-5ab0-8370-9825abdc7d2f', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 19', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('4761a57c-8778-5e15-87d2-8d465f6fb5b3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 20', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('ec4dbae8-04f4-512a-885e-e4a2f470ffd5', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 21', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('f91f8876-a774-5271-86b9-5f91a9be4649', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 22', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('492e94b3-e98d-5319-856b-67ab30878a56', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 23', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('616454a2-6698-5143-89f6-8518df857bdf', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 24', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('e45d06a8-5e85-5c81-88c8-8dd626b69ca2', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 25', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('12f125f5-3c01-5c16-8368-2c358e7200c6', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 26', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('9f641815-96d0-542f-8fdd-e20eb3bccea9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 27', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('afce7720-1fdd-5274-81d9-2b00023e95a7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 28', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('b361812f-5b7a-5c2f-85be-967b884bfd57', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 29', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('097db5c7-1624-5f1b-81ed-438f0c986ddc', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 30', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('2987decc-4b22-5aa3-85df-215f5bf6fe67', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 31', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('8e6900ef-d7bc-52b8-829d-bd5c0c4dc4a8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 32', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('b88bf6bb-5ab4-5fc7-8941-95c70ea376e9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 33', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('82610bec-70da-53f3-8862-d76497bd02ea', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 34', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('927b2e06-8ecf-55ba-82af-0f53e987e081', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 35', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('94ac8fb0-2c33-5680-89c7-72c2eb7c6e58', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 36', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('2a072ec1-4025-5df6-8950-7a3479b223cb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 37', 'high', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('253040e6-9dd5-5379-85c5-34c1234abafb', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 38', 'medium', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('4b715437-530e-56f2-81bd-268ac228ddce', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 39', 'low', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO vendors (id, org_id, name, tier, due_diligence_status, created_by, updated_by, created_at, updated_at)
    VALUES ('680f15d3-c9ec-5c86-8e50-5f6e4298282e', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'Vendor Co. 40', 'critical', 'in_review', '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  -- ============================================================
  -- 40 training assignments (users × courses)
  -- ============================================================
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('62fd496c-b6b4-52bd-87b7-4c41870723db', 'b3d55edc-1e3a-5166-8a89-29197596db90', '186a5fac-e9b0-529b-8539-47e0d25aacff', 'security-foundations', 'completed', NOW() - interval '0 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('3fdaff5b-c168-57cf-85b2-41e794454fbd', 'b3d55edc-1e3a-5166-8a89-29197596db90', '580df925-7a7b-5145-85e0-e85f4f5e1176', 'privacy-gdpr', 'in_progress', NOW() - interval '1 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('90c4d29d-2783-5e35-8688-984540f11a14', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'f66ca424-df86-5428-83e3-2117045b6faa', 'secure-coding', 'in_progress', NOW() - interval '2 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('b81d27b3-eedd-514d-8dfe-6363ba1d1320', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', 'incident-response', 'completed', NOW() - interval '3 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('e6adf79b-c2f3-5d09-8332-e794f3008e7c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', 'security-foundations', 'in_progress', NOW() - interval '4 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('e3dfbb78-fa9c-55bd-8c8a-e1a1ad9a02ac', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', 'privacy-gdpr', 'in_progress', NOW() - interval '5 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('65c95e67-d898-51e8-8818-abe1e3db19ed', 'b3d55edc-1e3a-5166-8a89-29197596db90', '4e303363-17b3-588f-849f-551b203f3e20', 'secure-coding', 'completed', NOW() - interval '6 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('195b8eac-477f-56be-8326-d3c4461d78f8', 'b3d55edc-1e3a-5166-8a89-29197596db90', '540d259a-2567-5be4-8c82-cbc006cf1a5a', 'incident-response', 'in_progress', NOW() - interval '7 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('23749cf2-5117-597a-8ebd-ee5d438bb3b0', 'b3d55edc-1e3a-5166-8a89-29197596db90', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', 'security-foundations', 'in_progress', NOW() - interval '8 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('388c7704-5964-5099-86d9-5b7be655953d', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', 'privacy-gdpr', 'completed', NOW() - interval '9 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('674f8371-534f-5db0-853b-e1724b26ee70', 'b3d55edc-1e3a-5166-8a89-29197596db90', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', 'secure-coding', 'in_progress', NOW() - interval '10 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('9c18df32-267f-5c28-88b6-44482dfac286', 'b3d55edc-1e3a-5166-8a89-29197596db90', '90712505-0723-5149-82e2-1d4ef2c6be6e', 'incident-response', 'in_progress', NOW() - interval '11 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('6e3f2a9d-1148-5e02-8ae1-733aaa110db7', 'b3d55edc-1e3a-5166-8a89-29197596db90', '186a5fac-e9b0-529b-8539-47e0d25aacff', 'security-foundations', 'completed', NOW() - interval '12 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('c83fffb1-3ce2-54b2-8dda-9b4608b72c2d', 'b3d55edc-1e3a-5166-8a89-29197596db90', '580df925-7a7b-5145-85e0-e85f4f5e1176', 'privacy-gdpr', 'in_progress', NOW() - interval '13 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('c23b3e48-eaf5-5563-89e7-521346b67362', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'f66ca424-df86-5428-83e3-2117045b6faa', 'secure-coding', 'in_progress', NOW() - interval '14 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('5a2c0e47-aa91-58c9-8d80-79083dd4f5e8', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', 'incident-response', 'completed', NOW() - interval '15 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('6ff856e7-83ca-55f6-8387-3b9e2908a93b', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', 'security-foundations', 'in_progress', NOW() - interval '16 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('0a87f622-7f85-5ba9-8cfe-1f8a6c010c05', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', 'privacy-gdpr', 'in_progress', NOW() - interval '17 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('3972a38d-b8ab-51e0-896f-1f237c67cb54', 'b3d55edc-1e3a-5166-8a89-29197596db90', '4e303363-17b3-588f-849f-551b203f3e20', 'secure-coding', 'completed', NOW() - interval '18 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('4023d0be-b588-5a54-8dbe-a8c82dbb9989', 'b3d55edc-1e3a-5166-8a89-29197596db90', '540d259a-2567-5be4-8c82-cbc006cf1a5a', 'incident-response', 'in_progress', NOW() - interval '19 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('713acbf4-19db-54d6-81bc-abb246c4a869', 'b3d55edc-1e3a-5166-8a89-29197596db90', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', 'security-foundations', 'in_progress', NOW() - interval '20 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('8d64556d-12d8-51ba-89a7-7e14b5fd4d8c', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', 'privacy-gdpr', 'completed', NOW() - interval '21 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('8a569065-3456-58ff-805d-8bb87eb74f53', 'b3d55edc-1e3a-5166-8a89-29197596db90', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', 'secure-coding', 'in_progress', NOW() - interval '22 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('bd7dfaa2-365f-5d3d-8efa-e3520e0a05aa', 'b3d55edc-1e3a-5166-8a89-29197596db90', '90712505-0723-5149-82e2-1d4ef2c6be6e', 'incident-response', 'in_progress', NOW() - interval '23 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('ea6192d1-1ac3-5b27-867a-fd6bfbbd0d9a', 'b3d55edc-1e3a-5166-8a89-29197596db90', '186a5fac-e9b0-529b-8539-47e0d25aacff', 'security-foundations', 'completed', NOW() - interval '24 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('a86664f4-1488-5700-8208-0269443df1f0', 'b3d55edc-1e3a-5166-8a89-29197596db90', '580df925-7a7b-5145-85e0-e85f4f5e1176', 'privacy-gdpr', 'in_progress', NOW() - interval '25 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('fb93822c-f98d-5328-824d-df8cfe5fbc46', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'f66ca424-df86-5428-83e3-2117045b6faa', 'secure-coding', 'in_progress', NOW() - interval '26 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('89c7b1fc-62d5-5870-8baf-18556e0b03e9', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', 'incident-response', 'completed', NOW() - interval '27 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('f431e15c-220f-5436-87c5-eae083054749', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'a48e314a-d056-599c-8b6c-0c2aab05fee5', 'security-foundations', 'in_progress', NOW() - interval '28 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('5305e1da-1ab2-58e0-805c-9310b61266c7', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9b55c03-e8e7-592b-8b1d-609f645132a2', 'privacy-gdpr', 'in_progress', NOW() - interval '29 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('d1ddf974-4057-526a-8223-208593abb584', 'b3d55edc-1e3a-5166-8a89-29197596db90', '4e303363-17b3-588f-849f-551b203f3e20', 'secure-coding', 'completed', NOW() - interval '30 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('1683c359-b4a1-5f19-8d54-7047f6c4fa6e', 'b3d55edc-1e3a-5166-8a89-29197596db90', '540d259a-2567-5be4-8c82-cbc006cf1a5a', 'incident-response', 'in_progress', NOW() - interval '31 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('768a10b4-c2f3-510d-8862-4b93bf04bbff', 'b3d55edc-1e3a-5166-8a89-29197596db90', '6e277f3b-a9f2-5efb-81f6-ae36a0ed8dce', 'security-foundations', 'in_progress', NOW() - interval '32 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('fcae032f-5584-55b7-8cae-83b301a0b121', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'cb194d12-45ae-5b20-87f6-d46ca9a5ea30', 'privacy-gdpr', 'completed', NOW() - interval '33 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('979f6f07-3715-5103-84a3-4352a68f6550', 'b3d55edc-1e3a-5166-8a89-29197596db90', '3938545a-d4e1-5def-8d7e-b93b1ecae1e7', 'secure-coding', 'in_progress', NOW() - interval '34 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('b5326cd9-2127-5c1a-8708-32060bc41f86', 'b3d55edc-1e3a-5166-8a89-29197596db90', '90712505-0723-5149-82e2-1d4ef2c6be6e', 'incident-response', 'in_progress', NOW() - interval '35 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('8f3af71a-47f8-5f1b-8762-ae769402fe37', 'b3d55edc-1e3a-5166-8a89-29197596db90', '186a5fac-e9b0-529b-8539-47e0d25aacff', 'security-foundations', 'completed', NOW() - interval '36 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('ee889a3b-1298-5b3f-8dfb-dbd27ea6af5d', 'b3d55edc-1e3a-5166-8a89-29197596db90', '580df925-7a7b-5145-85e0-e85f4f5e1176', 'privacy-gdpr', 'in_progress', NOW() - interval '37 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('939cd099-b280-59b6-8d41-361ec5be0bc3', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'f66ca424-df86-5428-83e3-2117045b6faa', 'secure-coding', 'in_progress', NOW() - interval '38 day', NULL, '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  INSERT INTO training_assignments (id, org_id, user_id, course_slug, status, assigned_at, completed_at, created_by, updated_by, created_at, updated_at)
    VALUES ('4a44aace-85ba-5351-854d-621c55c0a8bd', 'b3d55edc-1e3a-5166-8a89-29197596db90', 'd9d039f0-24c4-5a7a-8d13-e9241fc01a3b', 'incident-response', 'completed', NOW() - interval '39 day', NOW(), '186a5fac-e9b0-529b-8539-47e0d25aacff', '186a5fac-e9b0-529b-8539-47e0d25aacff', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;

COMMIT;

DO $seed$
BEGIN
  -- Summary: 1 org + 12 users + 22 frameworks + 150 controls + 120 evidence + 60 incidents + 80 risks + 40 vendors + 40 training = 524 rows (+1 org).;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421_ws09_seed.sql', SQLERRM;
END $seed$;
