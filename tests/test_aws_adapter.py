# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Tests for the AWS evidence adapter.

These run entirely offline against a stubbed boto3 session. What they assert
is the part that would otherwise be wrong in a way nobody notices: that a
posture check reports what the API actually returned, and that "we could not
look" never renders as "we looked and it is fine".
"""

from __future__ import annotations

import datetime as dt

import pytest

from sentinel.integrations.aws.adapter import AwsAdapter, AwsCredentials
from sentinel.integrations.base import CHECK_CATEGORIES
from sentinel.integrations.control_mapping import CATEGORY_TO_CONTROLS

CREDS = AwsCredentials(
    access_key_id="AKIAEXAMPLE",
    secret_access_key="secret",
    region="eu-west-1",
)


class FakeClient:
    """Returns canned payloads; raises whatever the fixture puts in its place."""

    def __init__(self, responses: dict):
        self._responses = responses

    def get_paginator(self, operation: str):
        # Force the adapter's non-paginated fallback path, which is the one a
        # stub can drive. The paginated path is boto3's own code.
        raise ValueError("no paginator in tests")

    def __getattr__(self, name: str):
        def call(**kwargs):
            value = self._responses.get(name)
            if isinstance(value, BaseException):
                raise value
            if callable(value):
                return value(**kwargs)
            if value is None:
                raise LookupError(f"unstubbed AWS call: {name}")
            return value

        return call


class FakeSession:
    def __init__(self, services: dict):
        self._services = services

    def client(self, service: str):
        return FakeClient(self._services.get(service, {}))


def adapter(services: dict) -> AwsAdapter:
    return AwsAdapter(CREDS, session=FakeSession(services))


# ── credentials and contract ────────────────────────────────────────────────


class TestCredentialsShape:
    def test_fields_match_the_connect_form(self):
        # The backend validates the submitted credential dict against this
        # dataclass, so a field the form does not send must have a default.
        import dataclasses

        required = [f.name for f in dataclasses.fields(AwsCredentials)
                    if f.default is dataclasses.MISSING]
        assert required == ["access_key_id", "secret_access_key"]

    def test_region_defaults_rather_than_guessing_per_call(self):
        creds = AwsCredentials(access_key_id="a", secret_access_key="b")
        assert creds.region == "us-east-1"


class TestValidate:
    @pytest.mark.asyncio
    async def test_valid_credentials_return_true(self):
        a = adapter({"sts": {"get_caller_identity": {"Account": "123456789012"}}})
        assert await a.validate() is True

    @pytest.mark.asyncio
    async def test_rejected_credentials_raise_a_readable_error(self):
        a = adapter({"sts": {"get_caller_identity": PermissionError("InvalidClientTokenId")}})
        with pytest.raises(ValueError) as excinfo:
            await a.validate()
        assert "AWS credentials rejected" in str(excinfo.value)

    @pytest.mark.asyncio
    async def test_assume_role_failure_names_the_role(self):
        creds = AwsCredentials(
            access_key_id="a", secret_access_key="b",
            role_arn="arn:aws:iam::123456789012:role/SentinelAudit",
        )
        a = AwsAdapter(creds, session=FakeSession(
            {"sts": {"get_caller_identity": PermissionError("AccessDenied")}}
        ))
        with pytest.raises(ValueError) as excinfo:
            await a.validate()
        assert "SentinelAudit" in str(excinfo.value)


# ── individual checks ───────────────────────────────────────────────────────


class TestIamChecks:
    @pytest.mark.asyncio
    async def test_root_without_mfa_is_critical(self):
        a = adapter({"iam": {"get_account_summary": {"SummaryMap": {"AccountMFAEnabled": 0}}}})
        (finding,) = await a._check_root_mfa()
        assert finding.status == "FAILED"
        assert finding.severity == "CRITICAL"
        assert finding.check_id == "aws.iam.root_mfa"

    @pytest.mark.asyncio
    async def test_root_with_mfa_passes(self):
        a = adapter({"iam": {"get_account_summary": {"SummaryMap": {"AccountMFAEnabled": 1}}}})
        (finding,) = await a._check_root_mfa()
        assert finding.status == "PASSED"

    @pytest.mark.asyncio
    async def test_programmatic_only_user_is_not_flagged_for_missing_mfa(self):
        # A user with no console password has nothing for MFA to protect.
        # Flagging one would be a false finding an operator cannot act on.
        def login_profile(UserName: str):
            if UserName == "ci-deploy":
                raise LookupError("NoSuchEntity")
            return {"LoginProfile": {"UserName": UserName}}

        a = adapter({"iam": {
            "list_users": {"Users": [{"UserName": "ci-deploy"}, {"UserName": "alice"}]},
            "get_login_profile": login_profile,
            "list_mfa_devices": {"MFADevices": [{"SerialNumber": "arn:…"}]},
        }})
        (finding,) = await a._check_user_mfa()
        assert finding.status == "PASSED"
        assert finding.result_details["console_users"] == 1

    @pytest.mark.asyncio
    async def test_console_user_without_mfa_fails(self):
        a = adapter({"iam": {
            "list_users": {"Users": [{"UserName": "alice"}]},
            "get_login_profile": {"LoginProfile": {"UserName": "alice"}},
            "list_mfa_devices": {"MFADevices": []},
        }})
        (finding,) = await a._check_user_mfa()
        assert finding.status == "FAILED"
        assert finding.result_details["users_without_mfa"] == ["alice"]

    @pytest.mark.asyncio
    async def test_absent_password_policy_is_a_finding_not_a_crash(self):
        a = adapter({"iam": {"get_account_password_policy": LookupError("NoSuchEntity")}})
        (finding,) = await a._check_password_policy()
        assert finding.status == "FAILED"
        assert finding.result_details["password_policy"] is None

    @pytest.mark.asyncio
    async def test_weak_password_policy_lists_each_gap(self):
        a = adapter({"iam": {"get_account_password_policy": {"PasswordPolicy": {
            "MinimumPasswordLength": 8,
            "RequireSymbols": True, "RequireNumbers": True,
            "RequireUppercaseCharacters": True, "RequireLowercaseCharacters": True,
            "PasswordReusePrevention": 5,
        }}}})
        (finding,) = await a._check_password_policy()
        assert finding.status == "WARNING"
        assert finding.result_details["gaps"] == ["minimum length is 8 (14+ expected)"]

    @pytest.mark.asyncio
    async def test_inactive_access_keys_are_not_counted_as_stale(self):
        old = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=400)
        a = adapter({"iam": {
            "list_users": {"Users": [{"UserName": "alice"}]},
            "list_access_keys": {"AccessKeyMetadata": [
                {"AccessKeyId": "AKIAOLDINACTIVE1", "Status": "Inactive", "CreateDate": old},
            ]},
        }})
        (finding,) = await a._check_access_key_age()
        assert finding.status == "PASSED"
        assert finding.result_details["active_keys"] == 0

    @pytest.mark.asyncio
    async def test_active_key_past_rotation_window_fails(self):
        old = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=400)
        a = adapter({"iam": {
            "list_users": {"Users": [{"UserName": "alice"}]},
            "list_access_keys": {"AccessKeyMetadata": [
                {"AccessKeyId": "AKIAEXAMPLE1234", "Status": "Active", "CreateDate": old},
            ]},
        }})
        (finding,) = await a._check_access_key_age()
        assert finding.status == "FAILED"
        # Only the last four characters of a key id are reported.
        assert finding.result_details["stale_keys"] == ["alice:1234"]
        assert "AKIAEXAMPLE1234" not in str(finding.result_details)


class TestLoggingAndEncryption:
    @pytest.mark.asyncio
    async def test_single_region_trail_does_not_satisfy_the_check(self):
        a = adapter({"cloudtrail": {
            "describe_trails": {"trailList": [{"Name": "local", "IsMultiRegionTrail": False}]},
        }})
        (finding,) = await a._check_cloudtrail()
        assert finding.status == "FAILED"
        assert finding.severity == "CRITICAL"

    @pytest.mark.asyncio
    async def test_multi_region_trail_must_also_be_logging(self):
        a = adapter({"cloudtrail": {
            "describe_trails": {"trailList": [
                {"Name": "org", "TrailARN": "arn:…:trail/org", "IsMultiRegionTrail": True},
            ]},
            "get_trail_status": {"IsLogging": False},
        }})
        (finding,) = await a._check_cloudtrail()
        assert finding.status == "FAILED"

    @pytest.mark.asyncio
    async def test_account_level_block_covers_every_bucket(self):
        a = adapter({
            "sts": {"get_caller_identity": {"Account": "123456789012"}},
            "s3control": {"get_public_access_block": {"PublicAccessBlockConfiguration": {
                "BlockPublicAcls": True, "IgnorePublicAcls": True,
                "BlockPublicPolicy": True, "RestrictPublicBuckets": True,
            }}},
            "s3": {"list_buckets": {"Buckets": [{"Name": "logs"}, {"Name": "assets"}]}},
        })
        (finding,) = await a._check_s3_public_access()
        assert finding.status == "PASSED"
        assert finding.result_details["account_block"] is True

    @pytest.mark.asyncio
    async def test_unreadable_bucket_encryption_is_not_reported_as_a_failure(self):
        # AccessDenied means we cannot see it. Calling that FAILED would put a
        # finding in front of an auditor that we did not actually observe.
        a = adapter({"s3": {
            "list_buckets": {"Buckets": [{"Name": "logs"}]},
            "get_bucket_encryption": PermissionError("AccessDenied"),
        }})
        (finding,) = await a._check_s3_encryption()
        assert finding.status == "NOT_AVAILABLE"
        assert finding.severity == "LOW"

    @pytest.mark.asyncio
    async def test_missing_encryption_configuration_is_a_real_failure(self):
        class NotFoundError(Exception):
            pass

        a = adapter({"s3": {
            "list_buckets": {"Buckets": [{"Name": "logs"}]},
            "get_bucket_encryption": NotFoundError(
                "ServerSideEncryptionConfigurationNotFoundError"
            ),
        }})
        (finding,) = await a._check_s3_encryption()
        assert finding.status == "FAILED"
        assert finding.result_details["unencrypted_buckets"] == ["logs"]

    @pytest.mark.asyncio
    async def test_rds_finding_states_the_region_it_observed(self):
        a = adapter({"rds": {"describe_db_instances": {"DBInstances": [
            {"DBInstanceIdentifier": "prod", "StorageEncrypted": False},
        ]}}})
        (finding,) = await a._check_rds_encryption()
        assert finding.status == "FAILED"
        assert finding.result_details["region"] == "eu-west-1"
        assert "eu-west-1" in finding.title


class TestNetworkExposure:
    @pytest.mark.asyncio
    async def test_https_open_to_the_world_is_not_a_finding(self):
        # A public load balancer on 443 is the normal case; flagging it would
        # bury the findings that matter under noise.
        a = adapter({"ec2": {"describe_security_groups": {"SecurityGroups": [{
            "GroupId": "sg-web",
            "IpPermissions": [{"FromPort": 443, "ToPort": 443,
                               "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}],
        }]}}})
        (finding,) = await a._check_security_group_ingress()
        assert finding.status == "PASSED"

    @pytest.mark.asyncio
    async def test_ssh_open_to_the_world_is_critical(self):
        a = adapter({"ec2": {"describe_security_groups": {"SecurityGroups": [{
            "GroupId": "sg-bastion",
            "IpPermissions": [{"FromPort": 22, "ToPort": 22,
                               "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}],
        }]}}})
        (finding,) = await a._check_security_group_ingress()
        assert finding.status == "FAILED"
        assert finding.severity == "CRITICAL"
        assert "sg-bastion" in finding.result_details["exposed_groups"][0]

    @pytest.mark.asyncio
    async def test_a_port_range_covering_an_admin_port_is_caught(self):
        # 1000-4000 contains 3389; a substring match on the port would miss it.
        a = adapter({"ec2": {"describe_security_groups": {"SecurityGroups": [{
            "GroupId": "sg-range",
            "IpPermissions": [{"FromPort": 1000, "ToPort": 4000,
                               "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}],
        }]}}})
        (finding,) = await a._check_security_group_ingress()
        assert finding.status == "FAILED"

    @pytest.mark.asyncio
    async def test_all_protocols_open_is_caught(self):
        a = adapter({"ec2": {"describe_security_groups": {"SecurityGroups": [{
            "GroupId": "sg-any",
            "IpPermissions": [{"IpRanges": [{"CidrIp": "0.0.0.0/0"}]}],
        }]}}})
        (finding,) = await a._check_security_group_ingress()
        assert finding.status == "FAILED"
        assert "all ports" in finding.result_details["exposed_groups"][0]

    @pytest.mark.asyncio
    async def test_ipv6_any_is_treated_like_ipv4_any(self):
        a = adapter({"ec2": {"describe_security_groups": {"SecurityGroups": [{
            "GroupId": "sg-v6",
            "IpPermissions": [{"FromPort": 3389, "ToPort": 3389,
                               "Ipv6Ranges": [{"CidrIpv6": "::/0"}]}],
        }]}}})
        (finding,) = await a._check_security_group_ingress()
        assert finding.status == "FAILED"


class TestKeysDetectionBackup:
    @pytest.mark.asyncio
    async def test_aws_managed_keys_are_not_flagged_for_rotation(self):
        # AWS-managed keys rotate on AWS's schedule and cannot be configured.
        a = adapter({"kms": {
            "list_keys": {"Keys": [{"KeyId": "aws-managed"}]},
            "describe_key": {"KeyMetadata": {"KeyManager": "AWS", "KeyState": "Enabled"}},
        }})
        (finding,) = await a._check_kms_key_rotation()
        assert finding.status == "PASSED"
        assert finding.result_details["customer_managed_keys"] == 0

    @pytest.mark.asyncio
    async def test_customer_key_without_rotation_warns(self):
        a = adapter({"kms": {
            "list_keys": {"Keys": [{"KeyId": "cmk-1"}]},
            "describe_key": {"KeyMetadata": {
                "KeyManager": "CUSTOMER", "KeyState": "Enabled",
                "KeySpec": "SYMMETRIC_DEFAULT",
            }},
            "get_key_rotation_status": {"KeyRotationEnabled": False},
        }})
        (finding,) = await a._check_kms_key_rotation()
        assert finding.status == "WARNING"
        assert finding.result_details["keys_without_rotation"] == ["cmk-1"]

    @pytest.mark.asyncio
    async def test_guardduty_detector_must_be_enabled_not_merely_present(self):
        a = adapter({"guardduty": {
            "list_detectors": {"DetectorIds": ["d-1"]},
            "get_detector": {"Status": "DISABLED"},
        }})
        (finding,) = await a._check_guardduty()
        assert finding.status == "FAILED"

    @pytest.mark.asyncio
    async def test_no_backup_plan_warns_and_says_what_it_cannot_see(self):
        a = adapter({"backup": {"list_backup_plans": {"BackupPlansList": []}}})
        (finding,) = await a._check_backup_plans()
        assert finding.status == "WARNING"
        # Service-native backups are invisible to this check; the finding must
        # say so rather than assert a gap it did not observe.
        assert "RDS automated backups" in finding.description


# ── whole-sync behaviour ────────────────────────────────────────────────────


class TestFetchAll:
    @pytest.mark.asyncio
    async def test_one_denied_service_does_not_sink_the_sync(self):
        # Only IAM is readable. Partial permissions must still yield the
        # evidence they cover, not nothing at all.
        a = adapter({
            "sts": {"get_caller_identity": {"Account": "123456789012"}},
            "iam": {
                "get_account_summary": {"SummaryMap": {"AccountMFAEnabled": 1}},
                "list_users": {"Users": []},
                "get_account_password_policy": LookupError("NoSuchEntity"),
                "list_attached_user_policies": {"AttachedPolicies": []},
            },
        })
        findings = await a.fetch_all()
        ids = {f.check_id for f in findings}
        assert "aws.iam.root_mfa" in ids
        assert "aws.iam.password_policy" in ids
        # The services that raised contributed nothing rather than an invented
        # PASSED or a crashed sync.
        assert "aws.rds.storage_encrypted" not in ids

    @pytest.mark.asyncio
    async def test_every_emitted_category_maps_to_controls(self):
        # A finding whose category the mapper does not know links to nothing,
        # so the evidence would never reach a control.
        a = adapter({
            "sts": {"get_caller_identity": {"Account": "1"}},
            "iam": {
                "get_account_summary": {"SummaryMap": {"AccountMFAEnabled": 1}},
                "list_users": {"Users": []},
                "get_account_password_policy": {"PasswordPolicy": {
                    "MinimumPasswordLength": 16, "RequireSymbols": True,
                    "RequireNumbers": True, "RequireUppercaseCharacters": True,
                    "RequireLowercaseCharacters": True, "PasswordReusePrevention": 24,
                }},
                "list_attached_user_policies": {"AttachedPolicies": []},
            },
            "cloudtrail": {"describe_trails": {"trailList": []}},
            "s3": {"list_buckets": {"Buckets": []}},
            "s3control": {"get_public_access_block": LookupError("NoSuchConfiguration")},
            "ec2": {"get_ebs_encryption_by_default": {"EbsEncryptionByDefault": True},
                    "describe_security_groups": {"SecurityGroups": []}},
            "rds": {"describe_db_instances": {"DBInstances": []}},
            "kms": {"list_keys": {"Keys": []}},
            "guardduty": {"list_detectors": {"DetectorIds": ["d"]},
                          "get_detector": {"Status": "ENABLED"}},
            "backup": {"list_backup_plans": {"BackupPlansList": [{"BackupPlanName": "daily"}]}},
        })
        findings = await a.fetch_all()
        assert len(findings) == 14, "every check should have produced a finding"
        for finding in findings:
            assert finding.check_category in CHECK_CATEGORIES
            assert finding.check_category in CATEGORY_TO_CONTROLS

    @pytest.mark.asyncio
    async def test_check_ids_are_stable_and_namespaced(self):
        a = adapter({
            "sts": {"get_caller_identity": {"Account": "1"}},
            "iam": {"get_account_summary": {"SummaryMap": {"AccountMFAEnabled": 1}}},
        })
        (finding,) = await a._check_root_mfa()
        # check_id is the upsert key for integration_findings; renaming one
        # orphans its history, so the shape is asserted deliberately.
        assert finding.check_id.startswith("aws.")
        assert finding.check_id.count(".") == 2
