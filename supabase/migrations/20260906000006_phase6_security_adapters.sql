-- Phase 6: Security / SIEM adapters — flip adapter_status to 'available'
-- so the Connect button appears on each catalogue card.
--
-- Matching adapters ship in sentinel/integrations/<slug>/adapter.py and
-- the connect forms live in dashboard/src/integrations/<slug>/config.ts.

UPDATE integration_catalog
SET    adapter_status = 'available',
       updated_at     = now()
WHERE  slug IN (
         'aikido',
         'aqua_security',
         'bitsight',
         'checkmarx',
         'crowdstrike',
         'datadog',
         'elastic_security',
         'gitguardian',
         'gitleaks',
         'grafana',
         'graylog',
         'lacework',
         'launchdarkly',
         'logrhythm',
         'nessus',
         'new_relic',
         'openvas',
         'orca_security',
         'prisma_cloud',
         'qualys',
         'rapid7_insightvm',
         'rollbar',
         'securityscorecard',
         'semgrep',
         'sentinelone',
         'sentry',
         'snyk',
         'sonarqube',
         'splunk',
         'splunk_enterprise',
         'sumo_logic',
         'tailscale',
         'tenable',
         'tenable_vulnerability_management_fedramp',
         'trivy',
         'trufflehog',
         'veracode',
         'wiz'
       )
  AND  adapter_status = 'catalogued';
