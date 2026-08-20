-- Enable Phase 2 shared-API family adapters.
--
-- WHY: sixteen new adapter slugs shipped in this release — Google family
-- (Workspace, Cloud Identity, Drive, GCP, Vertex AI, Chronicle), Atlassian
-- family (Jira, JSM, Confluence, Confluence Access Control, Bitbucket),
-- GitLab family (Cloud, Self-Managed, CI/CD), and AWS family (Bedrock,
-- Secrets Manager). Without flipping the catalogue rows the adapters exist
-- but no operator can reach them.
--
-- Idempotent: a second run is a no-op because the WHERE already matches.

UPDATE integration_catalog
SET    adapter_status = 'beta',
       updated_at     = now()
WHERE  slug IN (
         'google_workspace',
         'google_cloud_identity',
         'google_drive',
         'google_cloud_platform',
         'google_cloud_vertex_ai',
         'google_chronicle',
         'jira',
         'jira_service_management',
         'confluence',
         'confluence_access_control',
         'bitbucket_pipelines',
         'gitlab_cloud',
         'gitlab_self_managed',
         'gitlab_ci_cd',
         'aws_bedrock',
         'aws_secrets_manager'
       )
  AND  adapter_status = 'catalogued';
