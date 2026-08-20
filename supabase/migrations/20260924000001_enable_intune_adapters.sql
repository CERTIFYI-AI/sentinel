-- Enable the Microsoft Intune adapters (commercial + GCC High).
--
-- WHY: the Intune adapter shipped in this release. Without flipping the
-- catalogue row the adapter exists but no operator can reach it — the connect
-- modal shows "Catalogued" instead of a credential form.
--
-- Idempotent: a second run is a no-op because the WHERE already matches.

UPDATE integration_catalog
SET    adapter_status = 'beta',
       updated_at     = now()
WHERE  slug IN ('microsoft_intune', 'microsoft_intune_gcc_high')
  AND  adapter_status = 'catalogued';
