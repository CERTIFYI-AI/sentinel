-- Phase 5: Device / MDM adapters — flip adapter_status to 'available'
-- so the Connect button appears on each catalogue card.
--
-- Matching adapters ship in sentinel/integrations/<slug>/adapter.py and
-- the connect forms live in dashboard/src/integrations/<slug>/config.ts.

UPDATE integration_catalog
SET    adapter_status = 'available',
       updated_at     = now()
WHERE  slug IN (
         'jamf_pro',
         'kandji_iru',
         'mosyle',
         'addigy',
         'hexnode',
         'fleetdm',
         'ninjaone',
         'miradore',
         'manageengine',
         'omnissa_workspace_one',
         'vmware_workspace_one',
         'jumpcloud_mdm'
       )
  AND  adapter_status = 'catalogued';
