# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Adapter registry: catalog slug -> (AdapterClass, CredentialsClass).

The catalog (integration_catalog) lists the published evidence sources; this
registry lists the ones with a shipped adapter. ``adapter_status`` in the
catalog must agree with membership here — the worker refuses slugs it cannot
construct, the connect endpoint refuses them too, and the seed migrations only
mark connectable what exists in this file.

Adding an adapter is four steps, all of them required:

1. implement it under ``sentinel/integrations/<slug>/``;
2. register it here;
3. add its connect form to ``dashboard/src/integrations/<slug>/config.ts``
   and the registry beside it;
4. flip that catalogue row's ``adapter_status`` in a migration.

Skipping step 4 leaves a working adapter no operator can reach; skipping
step 2 leaves a Connect button that 400s. ``GET /v1/integrations/available``
returns this set so the UI can cross-check itself against the server.
"""

from __future__ import annotations

from sentinel.integrations.aws.adapter import AwsAdapter, AwsCredentials
from sentinel.integrations.azure.adapter import AzureAdapter, AzureCredentials
from sentinel.integrations.entra.adapter import (
    EntraAdapter,
    EntraCredentials,
    EntraGccHighCredentials,
)
from sentinel.integrations.github.adapter import GithubAdapter, GithubCredentials
from sentinel.integrations.intune.adapter import (
    IntuneAdapter,
    IntuneCredentials,
    IntuneGccHighCredentials,
)
from sentinel.integrations.okta.adapter import OktaAdapter, OktaCredentials

_REGISTRY: dict[str, tuple[type, type]] = {
    "github": (GithubAdapter, GithubCredentials),
    "aws": (AwsAdapter, AwsCredentials),
    # Catalogue slug for Azure is `microsoft_azure`; `azure` is not a row.
    "microsoft_azure": (AzureAdapter, AzureCredentials),
    "okta": (OktaAdapter, OktaCredentials),
    # One adapter, two catalogue slugs: the sovereign cloud is selected by the
    # credentials, so GCC High cannot silently query commercial endpoints.
    "microsoft_entra_id": (EntraAdapter, EntraCredentials),
    "microsoft_entra_id_gcc_high": (EntraAdapter, EntraGccHighCredentials),
    "microsoft_intune": (IntuneAdapter, IntuneCredentials),
    "microsoft_intune_gcc_high": (IntuneAdapter, IntuneGccHighCredentials),
}


def available_slugs() -> frozenset[str]:
    return frozenset(_REGISTRY)


def get_adapter_class(slug: str) -> tuple[type, type]:
    try:
        return _REGISTRY[slug]
    except KeyError:
        raise LookupError(
            f"no adapter shipped for integration {slug!r} — catalogued only; "
            f"available: {sorted(_REGISTRY)}"
        ) from None
