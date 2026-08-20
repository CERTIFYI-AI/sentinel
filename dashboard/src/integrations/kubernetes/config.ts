// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Field ids must match the KubernetesCredentials dataclass in
// sentinel/integrations/kubernetes/adapter.py

import type { IntegrationConfig } from '../types'

export const KubernetesConfig: IntegrationConfig = {
  id: 'kubernetes',
  category: 'security',
  name: 'Kubernetes',
  description:
    'Cluster security posture: RBAC over-permissioning on '
    + 'ClusterRoleBindings, pod hardening (root/resource limits), and '
    + 'whether workload secrets sit in plain Kubernetes Secrets.',
  logoUrl: '/integrations/kubernetes.svg',
  docsUrl: 'https://sentinel.certifyi.ai/docs/integrations/kubernetes',
  authMethod: 'api_key',
  credentialFields: [
    {
      id: 'api_server_url',
      label: 'API server URL',
      type: 'url',
      required: true,
      placeholder: 'https://cluster-api.example.com:6443',
      helpText: 'The Kubernetes API server endpoint for the cluster to monitor.',
    },
    {
      id: 'credential',
      label: 'Service account token',
      type: 'password',
      required: true,
      placeholder: '••••••••••••••••••••••••••••••••',
      helpText:
        'A bearer token for a service account with cluster-wide read '
        + 'access to namespaces, pods, secrets, and RBAC bindings.',
    },
  ],
  checkCategories: [
    'least_privilege',
    'endpoint_protection',
    'secret_management',
  ],
}
