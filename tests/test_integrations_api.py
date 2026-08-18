# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tests for the integration connect endpoint.

These assert the security invariants, not the happy path plumbing:

  * a slug with no shipped adapter is refused, so the UI and the server cannot
    disagree about what can collect;
  * a credential validation failure does not echo the submitted values back to
    the caller — a 400 body must never carry a token;
  * the organisation comes from the verified token, never the request body.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from sentinel.integrations import api as integrations_api
from sentinel.integrations.registry import available_slugs


class TestAdapterGate:
    """Only a registered adapter may be connected."""

    def test_registry_is_the_authority(self):
        slugs = available_slugs()
        assert isinstance(slugs, frozenset)
        # Whatever ships, the set must be explicit — never "everything".
        assert len(slugs) < 219, "every catalogue product cannot have an adapter"

    def test_github_ships_an_adapter(self):
        assert "github" in available_slugs()

    def test_catalogued_only_product_has_no_adapter(self):
        # AWS is catalogued but no adapter ships; connecting must be refused.
        assert "aws" not in available_slugs()

    def test_unknown_slug_raises_with_an_explanation(self):
        # The registry raises LookupError. KeyError is a SUBCLASS of it, so an
        # `except KeyError` in the endpoint would NOT catch this and an unknown
        # slug would surface as a 500. This test exists because that bug was
        # real; keep the assertion on LookupError.
        from sentinel.integrations.registry import get_adapter_class

        with pytest.raises(LookupError) as excinfo:
            get_adapter_class("definitely-not-a-product")
        # The message should tell an operator why, not just fail.
        assert "adapter" in str(excinfo.value).lower()


class TestConnectRequestShape:
    """The request model must not let a caller choose someone else's org."""

    def test_request_has_no_org_field(self):
        fields = set(integrations_api.ConnectRequest.model_fields)
        assert "org_id" not in fields
        assert "organization_id" not in fields
        assert "tenant_id" not in fields

    def test_request_requires_a_slug_and_credentials(self):
        fields = integrations_api.ConnectRequest.model_fields
        assert fields["catalog_slug"].is_required()
        assert fields["credentials"].is_required()

    def test_slug_length_is_bounded(self):
        # An unbounded slug is a cheap way to abuse a lookup.
        with pytest.raises(ValidationError):
            integrations_api.ConnectRequest(
                catalog_slug="x" * 500, credentials={"token": "t"}
            )


class TestResponseShape:
    """The response tells the operator what actually happened."""

    def test_response_reports_status_and_job(self):
        fields = set(integrations_api.ConnectResponse.model_fields)
        assert {"integration_id", "status", "job_id", "message"} <= fields

    def test_response_carries_no_credential_field(self):
        # Nothing about the submitted secret may travel back to the browser.
        fields = set(integrations_api.ConnectResponse.model_fields)
        assert not any("credential" in f or "token" in f or "secret" in f for f in fields)


class TestNoPlaintextLeak:
    """Credential values must not appear in source-level error strings."""

    def test_validation_error_message_is_generic(self):
        import inspect

        source = inspect.getsource(integrations_api.connect)
        # The 400 for bad credentials must not interpolate the submitted body.
        assert "do not match what the" in source
        assert "body.credentials}" not in source
        # `from None` keeps a pydantic error (which can quote values) off the wire.
        assert "from None" in source

    def test_db_error_is_not_surfaced_verbatim(self):
        import inspect

        source = inspect.getsource(integrations_api.connect)
        # The row carries the credential blob, so the driver message stays internal.
        assert "Could not save the integration" in source
