-- Enable Phase 1 Microsoft Graph family adapters.
--
-- WHY: nine new adapter slugs shipped in this release — SharePoint, OneDrive,
-- Teams, Defender for Endpoint (commercial + GCC High), Microsoft Sentinel,
-- Azure Key Vault, and Azure DevOps. Without flipping the catalogue rows the
-- adapters exist but no operator can reach them.
--
-- Idempotent: a second run is a no-op because the WHERE already matches.

UPDATE integration_catalog
SET    adapter_status = 'beta',
       updated_at     = now()
WHERE  slug IN (
         'microsoft_sharepoint',
         'microsoft_onedrive',
         'microsoft_teams',
         'microsoft_defender_for_endpoint',
         'microsoft_defender_for_endpoint_gcc_high',
         'microsoft_sentinel',
         'azure_key_vault',
         'azure_devops'
       )
  AND  adapter_status = 'catalogued';
