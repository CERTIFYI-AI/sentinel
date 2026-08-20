-- Phase 8: Collaboration, ticketing & business SaaS adapters — flip
-- adapter_status to 'available' so the Connect button appears on each
-- catalogue card. This completes the connector rollout: the registry now
-- ships 216 adapters against 219 catalogue rows.
--
-- Four catalogue rows deliberately stay catalogued-only:
--   * `drata` and `secureframe` — peer-GRC evidence import. Importing
--     another tool's conclusions is not first-party evidence, so these are
--     deferred indefinitely; 20260829000002 removes the rows outright.
--   * `sharepoint` and `onedrive` — bare duplicates of the Microsoft Graph
--     family rows. One adapter reachable under two slugs would let the same
--     product be connected twice and collect against two identities, so the
--     bare rows are left alone on purpose.
--
-- KNOWN PRE-EXISTING GAP (not introduced here, not fixed here): the
-- `microsoft_onedrive` adapter is registered and has a connect form, but no
-- catalogue row carries that slug — the catalogue only has the bare
-- `onedrive` row. 20260925000001 flips `microsoft_onedrive` and therefore
-- matches zero rows, leaving a working adapter no operator can reach (the
-- exact defect the registry docstring's step 4 warns about). Fixing it means
-- either renaming the catalogue row or adding one, both of which touch
-- `integrations.catalog_slug` on live rows, so it is recorded rather than
-- done inside this rollout migration.
--
-- Matching adapters ship in sentinel/integrations/<slug>/adapter.py and the
-- connect forms live in dashboard/src/integrations/<slug>/config.ts.
UPDATE integration_catalog
SET    adapter_status = 'available',
       updated_at     = now()
WHERE  slug IN (
         'slack',
         'zoom',
         'webex',
         'box',
         'dropbox',
         'notion',
         'docusign',
         'calendly',
         'miro',
         'servicenow',
         'zendesk',
         'asana',
         'linear',
         'clickup',
         'monday_com',
         'basecamp',
         'smartsheet',
         'teamwork',
         'freshservice',
         'salesforce',
         'hubspot',
         'pipedrive',
         'copper',
         'insightly',
         'close',
         'capsule',
         'gong',
         'gorgias',
         'intercom',
         'xero',
         'quickbooks',
         'brex',
         'ramp',
         'twilio',
         'apollo',
         'zoominfo',
         'envoy',
         'torii',
         'rockset',
         'clockwork',
         'knowbe4',
         'udemy_business',
         'wizer',
         'mimecast',
         'docebo',
         'cybeready',
         'breezy_hr',
         'cats',
         'jobvite',
         'smartrecruiters',
         'teamtailor',
         'jobadder',
         'lever',
         'comeet',
         'certn',
         'checkr',
         'oracle_cloud',
         'digitalocean',
         'vercel',
         'netlify',
         'scaleway',
         'supabase',
         'ovhcloud',
         'heroku',
         'akamai',
         'snowflake',
         'render',
         'mongodb_atlas',
         'mongodb_atlas_for_government',
         'ibm_cloud',
         'alibaba_cloud',
         'cloudflare',
         'kubernetes',
         'docker_hub',
         'github_actions',
         'jenkins',
         'circleci',
         'hashicorp_vault',
         'bitwarden',
         'fieldguide',
         'vouch_cyber_insurance',
         'a_scend'
       )
  AND  adapter_status = 'catalogued';
