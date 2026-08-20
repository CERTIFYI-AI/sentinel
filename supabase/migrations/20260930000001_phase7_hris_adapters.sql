-- Phase 7: HRIS / people adapters — flip adapter_status to 'available'
-- so the Connect button appears on each catalogue card.
--
-- Matching adapters ship in sentinel/integrations/<slug>/adapter.py (the
-- 7shifts slug's module is sentinel/integrations/seven_shifts/, since a
-- Python package name cannot start with a digit) and the connect forms
-- live in dashboard/src/integrations/<slug>/config.ts.

UPDATE integration_catalog
SET    adapter_status = 'available',
       updated_at     = now()
WHERE  slug IN (
         'workday',
         'sap_successfactors',
         'adp',
         'adp_workforce_now',
         'ukg',
         'paychex',
         'bamboohr',
         'hibob',
         'personio',
         'rippling',
         'gusto',
         'deel',
         'trinet',
         'justworks',
         'isolved',
         'payfit',
         'square_payroll',
         'kenjo',
         'netsuite',
         'factorial',
         'charthop',
         'humaans',
         'proliant',
         'alexishr',
         'employment_hero',
         '7shifts'
       )
  AND  adapter_status = 'catalogued';
