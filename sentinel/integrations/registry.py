# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Adapter registry: catalog slug -> (AdapterClass, CredentialsClass).

The catalog (integration_catalog) lists 219 connectable products; this
registry lists the ones with a shipped adapter. adapter_status='available'
in the catalog must agree with membership here — the worker refuses slugs it
cannot construct, and the seed migration only marks 'available' what exists.
"""

from __future__ import annotations

from sentinel.integrations.github.adapter import GithubAdapter, GithubCredentials

_REGISTRY: dict[str, tuple[type, type]] = {
    "github": (GithubAdapter, GithubCredentials),
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
