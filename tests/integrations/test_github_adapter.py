# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""GitHub adapter tests — the SDK is mocked at the client object, not HTTP.

Every check is exercised for its pass and fail shape, plus the
NOT_AVAILABLE paths (token can't read security_and_analysis; plan without
audit log API). validate() is tested with working and rejected credentials.
"""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from sentinel.integrations.base import CHECK_CATEGORIES
from sentinel.integrations.github.adapter import GithubAdapter, GithubCredentials

CREDS = GithubCredentials(token="ghp_test", organization="certifyi-ai")


def make_repo(name: str, *, private=True, archived=False, protected=True,
              secret_scanning="enabled", vuln_alerts=True, sa_readable=True):
    repo = MagicMock()
    repo.full_name = f"certifyi-ai/{name}"
    repo.private = private
    repo.archived = archived
    repo.default_branch = "main"
    repo.get_branch.return_value = SimpleNamespace(protected=protected)
    repo.get_vulnerability_alert.return_value = vuln_alerts
    if sa_readable:
        repo.security_and_analysis = SimpleNamespace(
            secret_scanning=SimpleNamespace(status=secret_scanning))
    else:
        repo.security_and_analysis = None
    return repo


def make_org(*, mfa=True, admins=1, members=10, plan="enterprise", repos=()):
    org = MagicMock()
    org.login = "certifyi-ai"
    org.two_factor_requirement_enabled = mfa
    org.plan = SimpleNamespace(name=plan)
    org.get_members.side_effect = lambda role=None: (
        [SimpleNamespace(login=f"admin{i}") for i in range(admins)]
        if role == "admin"
        else [SimpleNamespace(login=f"user{i}") for i in range(members)])
    org.get_repos.return_value = list(repos)
    return org


def adapter_for(org) -> GithubAdapter:
    client = MagicMock()
    client.get_organization.return_value = org
    return GithubAdapter(CREDS, client=client)


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


class TestValidate:
    def test_valid_credentials(self):
        assert run(adapter_for(make_org()).validate()) is True

    def test_invalid_credentials_raise_operator_readable_error(self):
        client = MagicMock()
        client.get_organization.side_effect = RuntimeError("401 Bad credentials")
        with pytest.raises(ValueError, match="certifyi-ai"):
            run(GithubAdapter(CREDS, client=client).validate())


class TestChecks:
    def test_mfa_passed(self):
        [f] = run(adapter_for(make_org(mfa=True))._check_org_mfa())
        assert (f.status, f.severity) == ("PASSED", "INFO")

    def test_mfa_failed_is_critical(self):
        [f] = run(adapter_for(make_org(mfa=False))._check_org_mfa())
        assert (f.status, f.severity) == ("FAILED", "CRITICAL")
        assert f.check_id == "github.org.mfa_required"

    def test_admin_ratio_passed(self):
        [f] = run(adapter_for(make_org(admins=1, members=10))._check_admin_ratio())
        assert f.status == "PASSED"

    def test_admin_ratio_warning(self):
        [f] = run(adapter_for(make_org(admins=3, members=10))._check_admin_ratio())
        assert f.status == "WARNING"

    def test_admin_ratio_failed(self):
        [f] = run(adapter_for(make_org(admins=5, members=10))._check_admin_ratio())
        assert f.status == "FAILED"

    def test_visibility_all_private(self):
        org = make_org(repos=[make_repo("a"), make_repo("b")])
        [f] = run(adapter_for(org)._check_repo_visibility())
        assert f.status == "PASSED"

    def test_visibility_public_repo_warns(self):
        org = make_org(repos=[make_repo("a", private=False)])
        [f] = run(adapter_for(org)._check_repo_visibility())
        assert f.status == "WARNING"
        assert f.result_details["public_repos"] == ["certifyi-ai/a"]

    def test_branch_protection_failed_lists_repos(self):
        org = make_org(repos=[make_repo("a", protected=False), make_repo("b")])
        [f] = run(adapter_for(org)._check_branch_protection())
        assert f.status == "FAILED"
        assert f.result_details["unprotected_repos"] == ["certifyi-ai/a"]

    def test_branch_protection_skips_archived(self):
        org = make_org(repos=[make_repo("old", protected=False, archived=True)])
        [f] = run(adapter_for(org)._check_branch_protection())
        assert f.status == "PASSED"

    def test_secret_scanning_disabled_fails(self):
        org = make_org(repos=[make_repo("a", secret_scanning="disabled")])
        [f] = run(adapter_for(org)._check_secret_scanning())
        assert f.status == "FAILED"

    def test_secret_scanning_unreadable_is_not_available(self):
        org = make_org(repos=[make_repo("a", sa_readable=False)])
        [f] = run(adapter_for(org)._check_secret_scanning())
        assert f.status == "NOT_AVAILABLE"

    def test_dependabot_disabled_fails(self):
        org = make_org(repos=[make_repo("a", vuln_alerts=False)])
        [f] = run(adapter_for(org)._check_dependabot_alerts())
        assert f.status == "FAILED"

    def test_audit_log_available_on_enterprise(self):
        [f] = run(adapter_for(make_org(plan="enterprise"))._check_audit_log())
        assert f.status == "PASSED"

    def test_audit_log_not_available_on_free(self):
        [f] = run(adapter_for(make_org(plan="free"))._check_audit_log())
        assert f.status == "NOT_AVAILABLE"


class TestFetchAll:
    def test_returns_all_checks_and_survives_one_failure(self):
        org = make_org(repos=[make_repo("a")])
        org.get_members.side_effect = RuntimeError("rate limited")
        findings = run(adapter_for(org).fetch_all())
        ids = {f.check_id for f in findings}
        assert "github.org.mfa_required" in ids
        assert "github.org.admin_ratio" not in ids  # the failed check is skipped, not fatal
        assert len(findings) == 6

    def test_every_category_is_mappable(self):
        org = make_org(repos=[make_repo("a")])
        for f in run(adapter_for(org).fetch_all()):
            assert f.check_category in CHECK_CATEGORIES

    def test_check_ids_are_stable_slugs(self):
        org = make_org(repos=[make_repo("a")])
        for f in run(adapter_for(org).fetch_all()):
            assert f.check_id.startswith("github.")
            assert " " not in f.check_id
