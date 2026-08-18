# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""AWS integration adapter.

Install: ``pip install 'sentinel-ai-grc[integrations]'`` (pulls ``boto3``).
The import is lazy, so the adapter module imports fine without boto3 present
and only a real connect attempt requires it.

Evidence source per the Continuous GRC master sheet: IAM posture, logging,
encryption at rest, network exposure, key management, threat detection and
backup. Everything this adapter calls is **read-only** — ``Describe*``,
``Get*``, ``List*``. Attach the AWS-managed ``SecurityAudit`` policy (or
``ReadOnlyAccess``); nothing here mutates an account, and no adapter is
permitted database access either — the worker persists what is returned.

Two authentication shapes are supported, both from the connect form:

* **Access keys** — an IAM user with ``SecurityAudit``. Simplest, and the
  credentials are stored AES-256-GCM encrypted, never in the browser.
* **Cross-account role** — keys (or the ambient instance role) that may
  ``sts:AssumeRole`` into ``role_arn`` with an ``external_id``. This is the
  posture AWS itself recommends for third-party auditors, because the
  customer can revoke it without rotating a secret.

Control mapping table (resolved by sentinel/integrations/control_mapping.py;
a framework the org has not enabled contributes no links):

┌────────────────────────────────────┬──────────────────────────┬────────────────────────────────────────────┐
│ check_id                           │ check_category           │ Controls mapped                            │
├────────────────────────────────────┼──────────────────────────┼────────────────────────────────────────────┤
│ aws.iam.root_mfa                   │ mfa_enforcement          │ SOC2 CC6.1/CC6.6 · ISO27001 A.9.4.2        │
│ aws.iam.user_mfa                   │ mfa_enforcement          │ · HIPAA 164.312(a)(2)(i) · PCI 8.3         │
│ aws.iam.password_policy            │ access_control           │ SOC2 CC6.1–6.3 · ISO27001 A.9.1.1/A.9.2.1  │
│ aws.iam.access_key_age             │ access_control           │ · PCI 7.1/7.2 · GDPR Art. 25               │
│ aws.s3.public_access_block         │ access_control           │                                            │
│ aws.iam.admin_policy_attachments   │ least_privilege          │ SOC2 CC6.3 · ISO27001 A.9.2.3 · PCI 7.1    │
│ aws.cloudtrail.multi_region        │ audit_logging            │ SOC2 CC7.2/7.3 · ISO27001 A.12.4.1/A.12.4.3│
│                                    │                          │ · HIPAA 164.312(b) · PCI 10.1/10.2         │
│ aws.s3.default_encryption          │ encryption_at_rest       │ SOC2 CC9.1 · ISO27001 A.10.1.1             │
│ aws.ec2.ebs_encryption_default     │ encryption_at_rest       │ · HIPAA 164.312(a)(2)(iv) · PCI 3.4        │
│ aws.rds.storage_encrypted          │ encryption_at_rest       │ · GDPR Art. 32                             │
│ aws.ec2.security_group_ingress     │ network_security         │ SOC2 CC6.6/CC6.7 · ISO27001 A.13.1.1       │
│                                    │                          │ · PCI 1.1/1.2                              │
│ aws.kms.key_rotation               │ secret_management        │ SOC2 CC6.1 · ISO27001 A.9.2.4 · PCI 8.2    │
│ aws.guardduty.enabled              │ incident_response        │ SOC2 CC7.3/7.4 · ISO27001 A.16.1.1         │
│                                    │                          │ · HIPAA 164.308(a)(6) · PCI 12.10          │
│ aws.backup.plans                   │ backup_recovery          │ SOC2 A1.2/A1.3 · ISO27001 A.12.3.1         │
│                                    │                          │ · HIPAA 164.308(a)(7)                      │
└────────────────────────────────────┴──────────────────────────┴────────────────────────────────────────────┘

Scope note: the account-wide checks (IAM, S3, GuardDuty findings of fact) are
global; the resource checks run in the configured ``region`` only. A finding
therefore states the region it observed, so nobody reads a single-region
result as an account-wide assertion.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import logging
from dataclasses import dataclass

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

#: An access key older than this is a finding. 90 days is the CIS AWS
#: Foundations Benchmark threshold and what auditors ask for.
_KEY_MAX_AGE_DAYS = 90

#: Ingress from anywhere. Port-restricted 0.0.0.0/0 on 443 is normal for a
#: load balancer; unrestricted or admin-port exposure is not.
_ANY_IPV4 = "0.0.0.0/0"
_ANY_IPV6 = "::/0"
#: Ports whose exposure to the internet is a finding regardless of intent.
_ADMIN_PORTS = {22, 23, 3389, 445, 1433, 3306, 5432, 6379, 27017, 9200}


@dataclass
class AwsCredentials:
    """Matches dashboard/src/integrations/aws/config.ts credentialFields."""

    access_key_id: str
    secret_access_key: str
    region: str = "us-east-1"
    #: Only for temporary STS credentials pasted directly.
    session_token: str = ""
    #: Optional cross-account role to assume once authenticated.
    role_arn: str = ""
    #: Required by the role's trust policy when role_arn is used. AWS treats a
    #: missing external id as a confused-deputy risk for third-party access.
    external_id: str = ""


class AwsAdapter:
    """Reads security posture from an AWS account via boto3.

    No database access; the worker persists returned findings. boto3 calls are
    blocking, so every one of them runs through ``asyncio.to_thread``.
    """

    def __init__(self, credentials: AwsCredentials, session=None) -> None:
        self.credentials = credentials
        # Injectable for tests; built lazily otherwise so importing this module
        # never requires boto3 or reaches the network.
        self._session = session

    # ── session / clients ───────────────────────────────────────────────────

    def _boto_session(self):
        if self._session is not None:
            return self._session

        import boto3  # pip install boto3

        base = boto3.session.Session(
            aws_access_key_id=self.credentials.access_key_id or None,
            aws_secret_access_key=self.credentials.secret_access_key or None,
            aws_session_token=self.credentials.session_token or None,
            region_name=self.credentials.region or "us-east-1",
        )
        if not self.credentials.role_arn:
            self._session = base
            return self._session

        # Cross-account audit: assume the customer's role and use the short
        # lived credentials it hands back. The long-lived key never touches
        # their account beyond the AssumeRole call itself.
        assume_kwargs = {
            "RoleArn": self.credentials.role_arn,
            "RoleSessionName": "sentinel-grc-evidence",
        }
        if self.credentials.external_id:
            assume_kwargs["ExternalId"] = self.credentials.external_id
        assumed = base.client("sts").assume_role(**assume_kwargs)["Credentials"]
        self._session = boto3.session.Session(
            aws_access_key_id=assumed["AccessKeyId"],
            aws_secret_access_key=assumed["SecretAccessKey"],
            aws_session_token=assumed["SessionToken"],
            region_name=self.credentials.region or "us-east-1",
        )
        return self._session

    def _client(self, service: str):
        return self._boto_session().client(service)

    async def _call(self, service: str, operation: str, **kwargs) -> dict:
        """One read-only API call, off the event loop."""

        def _run() -> dict:
            return getattr(self._client(service), operation)(**kwargs)

        return await asyncio.to_thread(_run)

    async def _paginate(self, service: str, operation: str, key: str, **kwargs) -> list:
        """Collect every page of a list operation. Truncated results are how a
        posture check quietly becomes wrong on a large account."""

        def _run() -> list:
            client = self._client(service)
            try:
                pages = client.get_paginator(operation).paginate(**kwargs)
            except Exception:  # noqa: BLE001 — operation has no paginator
                return list(getattr(client, operation)(**kwargs).get(key, []))
            out: list = []
            for page in pages:
                out.extend(page.get(key, []))
            return out

        return await asyncio.to_thread(_run)

    # ── contract ────────────────────────────────────────────────────────────

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        try:
            identity = await self._call("sts", "get_caller_identity")
            self._account_id = str(identity.get("Account", ""))
            return True
        except Exception as exc:  # noqa: BLE001 — normalized for the operator
            raise ValueError(
                "AWS credentials rejected"
                + (f" while assuming {self.credentials.role_arn!r}" if self.credentials.role_arn else "")
                + f": {exc}"
            ) from exc

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync.

        A failure here is usually a missing read permission on one service,
        and losing the other twelve results because of it would make partial
        access look like no evidence at all.
        """
        checks = (
            self._check_root_mfa(),
            self._check_user_mfa(),
            self._check_password_policy(),
            self._check_access_key_age(),
            self._check_admin_policy_attachments(),
            self._check_cloudtrail(),
            self._check_s3_public_access(),
            self._check_s3_encryption(),
            self._check_ebs_default_encryption(),
            self._check_rds_encryption(),
            self._check_security_group_ingress(),
            self._check_kms_key_rotation(),
            self._check_guardduty(),
            self._check_backup_plans(),
        )
        results = await asyncio.gather(*checks, return_exceptions=True)
        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("aws check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    @property
    def _region(self) -> str:
        return self.credentials.region or "us-east-1"

    # ── IAM ─────────────────────────────────────────────────────────────────

    async def _check_root_mfa(self) -> list[IntegrationFinding]:
        summary = (await self._call("iam", "get_account_summary")).get("SummaryMap", {})
        enabled = bool(summary.get("AccountMFAEnabled", 0))
        return [IntegrationFinding(
            check_id="aws.iam.root_mfa",
            title="Root account has MFA enabled" if enabled
                  else "Root account has no MFA device",
            description=(
                "The account root user has an MFA device registered."
                if enabled else
                "The account root user can sign in with a password alone. Root "
                "holds unrestricted control of the account and cannot be "
                "restricted by IAM policy."
            ),
            remediation="IAM → Security credentials on the root user → assign an "
                        "MFA device, preferably hardware.",
            status="PASSED" if enabled else "FAILED",
            severity="INFO" if enabled else "CRITICAL",
            check_category="mfa_enforcement",
            result_details={"account_mfa_enabled": enabled},
        )]

    async def _check_user_mfa(self) -> list[IntegrationFinding]:
        users = await self._paginate("iam", "list_users", "Users")
        without: list[str] = []
        console_users = 0
        for user in users:
            name = user.get("UserName", "")
            # Only console sign-in is protected by MFA; a programmatic-only
            # user has no password to protect, so flagging it is noise.
            try:
                await self._call("iam", "get_login_profile", UserName=name)
            except Exception:  # noqa: BLE001 — NoSuchEntity: no console access
                continue
            console_users += 1
            devices = (await self._call("iam", "list_mfa_devices", UserName=name)).get(
                "MFADevices", []
            )
            if not devices:
                without.append(name)
        status = "PASSED" if not without else "FAILED"
        return [IntegrationFinding(
            check_id="aws.iam.user_mfa",
            title=(f"{len(without)} of {console_users} console users have no MFA"
                   if without else
                   f"All {console_users} console users have MFA" if console_users
                   else "No IAM users have console access"),
            description=("Console sign-in without MFA: " + ", ".join(sorted(without)[:20])
                         if without else
                         "Every IAM user with a console password has an MFA device."),
            remediation="IAM → Users → Security credentials → assign an MFA "
                        "device, or enforce it with an SCP / permission boundary.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="mfa_enforcement",
            result_details={"users_without_mfa": sorted(without),
                            "console_users": console_users},
        )]

    async def _check_password_policy(self) -> list[IntegrationFinding]:
        try:
            policy = (await self._call("iam", "get_account_password_policy")).get(
                "PasswordPolicy", {}
            )
        except Exception:  # noqa: BLE001 — NoSuchEntity: no policy set at all
            return [IntegrationFinding(
                check_id="aws.iam.password_policy",
                title="No IAM account password policy is set",
                description="The account uses the AWS default, which does not "
                            "require length, complexity or reuse prevention.",
                remediation="IAM → Account settings → set a password policy "
                            "(14+ characters, complexity, reuse prevention).",
                status="FAILED",
                severity="MEDIUM",
                check_category="access_control",
                result_details={"password_policy": None},
            )]
        min_len = int(policy.get("MinimumPasswordLength", 0))
        weaknesses = []
        if min_len < 14:
            weaknesses.append(f"minimum length is {min_len} (14+ expected)")
        if not policy.get("RequireSymbols"):
            weaknesses.append("symbols not required")
        if not policy.get("RequireNumbers"):
            weaknesses.append("numbers not required")
        if not policy.get("RequireUppercaseCharacters"):
            weaknesses.append("uppercase not required")
        if not policy.get("RequireLowercaseCharacters"):
            weaknesses.append("lowercase not required")
        if not policy.get("PasswordReusePrevention"):
            weaknesses.append("password reuse is not prevented")
        status = "PASSED" if not weaknesses else "WARNING"
        return [IntegrationFinding(
            check_id="aws.iam.password_policy",
            title=("IAM password policy meets the baseline" if not weaknesses
                   else f"IAM password policy has {len(weaknesses)} gap(s)"),
            description=("The account password policy requires length, complexity "
                         "and reuse prevention." if not weaknesses
                         else "Gaps: " + "; ".join(weaknesses) + "."),
            remediation="IAM → Account settings → Password policy.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"minimum_password_length": min_len, "gaps": weaknesses},
        )]

    async def _check_access_key_age(self) -> list[IntegrationFinding]:
        users = await self._paginate("iam", "list_users", "Users")
        cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=_KEY_MAX_AGE_DAYS)
        stale: list[str] = []
        total = 0
        for user in users:
            name = user.get("UserName", "")
            keys = (await self._call("iam", "list_access_keys", UserName=name)).get(
                "AccessKeyMetadata", []
            )
            for key in keys:
                if key.get("Status") != "Active":
                    continue
                total += 1
                created = key.get("CreateDate")
                if isinstance(created, dt.datetime) and created < cutoff:
                    stale.append(f"{name}:{key.get('AccessKeyId', '')[-4:]}")
        status = "PASSED" if not stale else "FAILED"
        return [IntegrationFinding(
            check_id="aws.iam.access_key_age",
            title=(f"{len(stale)} of {total} active access keys are older than "
                   f"{_KEY_MAX_AGE_DAYS} days" if stale else
                   f"All {total} active access keys are within {_KEY_MAX_AGE_DAYS} days"
                   if total else "No active IAM access keys"),
            description=("Keys past rotation (user:last-4): " + ", ".join(stale[:20])
                         if stale else
                         "Every active access key was created inside the rotation window."),
            remediation="Rotate the key, update whatever consumes it, then "
                        "deactivate and delete the old key. Prefer IAM roles to "
                        "long-lived keys where the workload allows it.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"stale_keys": stale, "active_keys": total,
                            "max_age_days": _KEY_MAX_AGE_DAYS},
        )]

    async def _check_admin_policy_attachments(self) -> list[IntegrationFinding]:
        users = await self._paginate("iam", "list_users", "Users")
        admins: list[str] = []
        for user in users:
            name = user.get("UserName", "")
            attached = (await self._call(
                "iam", "list_attached_user_policies", UserName=name
            )).get("AttachedPolicies", [])
            if any(p.get("PolicyName") == "AdministratorAccess" for p in attached):
                admins.append(name)
        total = len(users)
        ratio = (len(admins) / total) if total else 0.0
        # A couple of break-glass administrators is expected; a third of the
        # account holding AdministratorAccess directly is not least privilege.
        status = "PASSED" if len(admins) <= 2 or ratio <= 0.15 else (
            "WARNING" if ratio <= 0.34 else "FAILED")
        return [IntegrationFinding(
            check_id="aws.iam.admin_policy_attachments",
            title=f"{len(admins)} of {total} IAM users hold AdministratorAccess directly",
            description=("Users with AdministratorAccess attached directly: "
                         + ", ".join(sorted(admins)[:20]) if admins else
                         "No IAM user has AdministratorAccess attached directly."),
            remediation="Replace direct AdministratorAccess with a scoped role "
                        "the user assumes when needed, so administrative use is "
                        "deliberate and logged.",
            status=status,
            severity="INFO" if status == "PASSED" else ("MEDIUM" if status == "WARNING" else "HIGH"),
            check_category="least_privilege",
            result_details={"admin_users": sorted(admins), "user_count": total},
        )]

    # ── logging ─────────────────────────────────────────────────────────────

    async def _check_cloudtrail(self) -> list[IntegrationFinding]:
        trails = (await self._call("cloudtrail", "describe_trails")).get("trailList", [])
        multi_region = [t for t in trails if t.get("IsMultiRegionTrail")]
        logging_on: list[str] = []
        for trail in multi_region:
            name = trail.get("TrailARN") or trail.get("Name", "")
            try:
                st = await self._call("cloudtrail", "get_trail_status", Name=name)
            except Exception:  # noqa: BLE001 — trail in another account/region
                continue
            if st.get("IsLogging"):
                logging_on.append(trail.get("Name", name))
        status = "PASSED" if logging_on else "FAILED"
        return [IntegrationFinding(
            check_id="aws.cloudtrail.multi_region",
            title=("Multi-region CloudTrail is logging" if logging_on
                   else "No multi-region CloudTrail is actively logging"),
            description=(f"Active multi-region trails: {', '.join(logging_on)}."
                         if logging_on else
                         f"{len(trails)} trail(s) configured, none of them "
                         "multi-region and actively logging. API activity in "
                         "unmonitored regions leaves no audit record."),
            remediation="CloudTrail → Create trail → apply to all regions, with "
                        "log file validation on and the bucket locked down.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="audit_logging",
            result_details={"trails": len(trails),
                            "multi_region_logging": logging_on},
        )]

    # ── storage / encryption ────────────────────────────────────────────────

    async def _check_s3_public_access(self) -> list[IntegrationFinding]:
        account_blocked = False
        try:
            acct = await self._call(
                "s3control", "get_public_access_block", AccountId=await self._account()
            )
            cfg = acct.get("PublicAccessBlockConfiguration", {})
            account_blocked = all(
                cfg.get(k) for k in
                ("BlockPublicAcls", "IgnorePublicAcls",
                 "BlockPublicPolicy", "RestrictPublicBuckets")
            )
        except Exception:  # noqa: BLE001 — not configured, or no s3control read
            account_blocked = False

        buckets = (await self._call("s3", "list_buckets")).get("Buckets", [])
        unblocked: list[str] = []
        if not account_blocked:
            for bucket in buckets:
                name = bucket.get("Name", "")
                try:
                    cfg = (await self._call("s3", "get_public_access_block", Bucket=name)).get(
                        "PublicAccessBlockConfiguration", {}
                    )
                except Exception:  # noqa: BLE001 — no block configuration at all
                    unblocked.append(name)
                    continue
                if not all(cfg.get(k) for k in
                           ("BlockPublicAcls", "IgnorePublicAcls",
                            "BlockPublicPolicy", "RestrictPublicBuckets")):
                    unblocked.append(name)
        status = "PASSED" if account_blocked or not unblocked else "FAILED"
        return [IntegrationFinding(
            check_id="aws.s3.public_access_block",
            title=("S3 public access is blocked account-wide" if account_blocked else
                   f"{len(unblocked)} S3 buckets do not fully block public access"
                   if unblocked else "All S3 buckets block public access"),
            description=("The account-level public access block covers every "
                         "bucket, present and future."
                         if account_blocked else
                         ("Buckets without a full block: " + ", ".join(unblocked[:20])
                          if unblocked else
                          f"All {len(buckets)} buckets block public access individually.")),
            remediation="S3 → Block Public Access settings for this account → "
                        "enable all four. Account level is preferable: it also "
                        "covers buckets created later.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="access_control",
            result_details={"account_block": account_blocked,
                            "unblocked_buckets": unblocked,
                            "bucket_count": len(buckets)},
        )]

    async def _check_s3_encryption(self) -> list[IntegrationFinding]:
        buckets = (await self._call("s3", "list_buckets")).get("Buckets", [])
        unencrypted: list[str] = []
        unreadable = 0
        for bucket in buckets:
            name = bucket.get("Name", "")
            try:
                enc = await self._call("s3", "get_bucket_encryption", Bucket=name)
            except Exception as exc:  # noqa: BLE001
                # ServerSideEncryptionConfigurationNotFoundError means genuinely
                # unencrypted; AccessDenied means we simply cannot see it, and
                # reporting that as a failure would be an invented finding.
                if "NotFound" in type(exc).__name__ or "NotFound" in str(exc):
                    unencrypted.append(name)
                else:
                    unreadable += 1
                continue
            rules = enc.get("ServerSideEncryptionConfiguration", {}).get("Rules", [])
            if not rules:
                unencrypted.append(name)
        if buckets and unreadable == len(buckets):
            status: str = "NOT_AVAILABLE"
        else:
            status = "PASSED" if not unencrypted else "FAILED"
        return [IntegrationFinding(
            check_id="aws.s3.default_encryption",
            title={"NOT_AVAILABLE": "Bucket encryption not readable by these credentials",
                   "PASSED": f"All {len(buckets)} S3 buckets have default encryption",
                   "FAILED": f"{len(unencrypted)} S3 buckets have no default encryption",
                   }[status],
            description=("These credentials cannot read bucket encryption "
                         "configuration; grant s3:GetEncryptionConfiguration."
                         if status == "NOT_AVAILABLE" else
                         ("Without default encryption: " + ", ".join(unencrypted[:20])
                          if unencrypted else
                          "Every bucket applies server-side encryption by default.")),
            remediation="S3 → bucket → Properties → Default encryption (SSE-S3 "
                        "or SSE-KMS). New buckets are encrypted by default; "
                        "older ones may not be.",
            status=status,  # type: ignore[arg-type]
            severity="INFO" if status == "PASSED" else ("LOW" if status == "NOT_AVAILABLE" else "HIGH"),
            check_category="encryption_at_rest",
            result_details={"unencrypted_buckets": unencrypted,
                            "unreadable_buckets": unreadable,
                            "bucket_count": len(buckets)},
        )]

    async def _check_ebs_default_encryption(self) -> list[IntegrationFinding]:
        result = await self._call("ec2", "get_ebs_encryption_by_default")
        enabled = bool(result.get("EbsEncryptionByDefault"))
        return [IntegrationFinding(
            check_id="aws.ec2.ebs_encryption_default",
            title=(f"EBS encryption by default is on in {self._region}" if enabled
                   else f"EBS encryption by default is off in {self._region}"),
            description=(f"New EBS volumes in {self._region} are encrypted automatically."
                         if enabled else
                         f"New EBS volumes in {self._region} are created unencrypted "
                         "unless the caller asks for encryption explicitly. This "
                         "setting is per-region."),
            remediation="EC2 → Settings → Data protection and security → turn on "
                        "'Always encrypt new EBS volumes', in every region in use.",
            status="PASSED" if enabled else "FAILED",
            severity="INFO" if enabled else "HIGH",
            check_category="encryption_at_rest",
            result_details={"region": self._region, "enabled": enabled},
        )]

    async def _check_rds_encryption(self) -> list[IntegrationFinding]:
        instances = await self._paginate("rds", "describe_db_instances", "DBInstances")
        unencrypted = [i.get("DBInstanceIdentifier", "")
                       for i in instances if not i.get("StorageEncrypted")]
        status = "PASSED" if not unencrypted else "FAILED"
        return [IntegrationFinding(
            check_id="aws.rds.storage_encrypted",
            title=(f"{len(unencrypted)} RDS instances in {self._region} are unencrypted"
                   if unencrypted else
                   f"All {len(instances)} RDS instances in {self._region} are encrypted"
                   if instances else f"No RDS instances in {self._region}"),
            description=("Unencrypted storage: " + ", ".join(unencrypted[:20])
                         if unencrypted else
                         f"Every RDS instance in {self._region} encrypts its storage at rest."),
            remediation="RDS storage encryption cannot be enabled in place: "
                        "snapshot the instance, copy the snapshot with "
                        "encryption on, and restore from the encrypted copy.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="encryption_at_rest",
            result_details={"region": self._region,
                            "unencrypted_instances": unencrypted,
                            "instance_count": len(instances)},
        )]

    # ── network ─────────────────────────────────────────────────────────────

    async def _check_security_group_ingress(self) -> list[IntegrationFinding]:
        groups = await self._paginate("ec2", "describe_security_groups", "SecurityGroups")
        exposed: list[str] = []
        for group in groups:
            gid = group.get("GroupId", "")
            for rule in group.get("IpPermissions", []):
                open_to_world = any(r.get("CidrIp") == _ANY_IPV4 for r in rule.get("IpRanges", [])) \
                    or any(r.get("CidrIpv6") == _ANY_IPV6 for r in rule.get("Ipv6Ranges", []))
                if not open_to_world:
                    continue
                from_port, to_port = rule.get("FromPort"), rule.get("ToPort")
                if from_port is None or to_port is None:
                    # All protocols / all ports open to the internet.
                    exposed.append(f"{gid} (all ports)")
                    continue
                hits = sorted(p for p in _ADMIN_PORTS if from_port <= p <= to_port)
                if hits:
                    exposed.append(f"{gid} ({', '.join(str(p) for p in hits)})")
        status = "PASSED" if not exposed else "FAILED"
        return [IntegrationFinding(
            check_id="aws.ec2.security_group_ingress",
            title=(f"{len(exposed)} security groups expose admin ports to the internet"
                   if exposed else
                   f"No security group in {self._region} exposes admin ports to the internet"),
            description=("Open to 0.0.0.0/0 or ::/0: " + "; ".join(exposed[:20])
                         if exposed else
                         f"All {len(groups)} security groups in {self._region} keep "
                         "administrative and database ports off the public internet."),
            remediation="Restrict the rule to the specific CIDR that needs it, "
                        "or move access behind SSM Session Manager / a bastion / VPN.",
            status=status,
            severity="INFO" if status == "PASSED" else "CRITICAL",
            check_category="network_security",
            result_details={"region": self._region, "exposed_groups": exposed,
                            "group_count": len(groups),
                            "admin_ports": sorted(_ADMIN_PORTS)},
        )]

    # ── keys, detection, backup ─────────────────────────────────────────────

    async def _check_kms_key_rotation(self) -> list[IntegrationFinding]:
        keys = await self._paginate("kms", "list_keys", "Keys")
        without_rotation: list[str] = []
        customer_keys = 0
        for key in keys:
            key_id = key.get("KeyId", "")
            try:
                meta = (await self._call("kms", "describe_key", KeyId=key_id)).get(
                    "KeyMetadata", {}
                )
            except Exception:  # noqa: BLE001
                continue
            # AWS-managed keys rotate on AWS's schedule and cannot be configured,
            # so only customer-managed keys are a finding.
            if meta.get("KeyManager") != "CUSTOMER" or meta.get("KeyState") != "Enabled":
                continue
            if meta.get("KeySpec", "SYMMETRIC_DEFAULT") != "SYMMETRIC_DEFAULT":
                continue  # asymmetric keys do not support automatic rotation
            customer_keys += 1
            try:
                rotating = (await self._call(
                    "kms", "get_key_rotation_status", KeyId=key_id
                )).get("KeyRotationEnabled", False)
            except Exception:  # noqa: BLE001
                continue
            if not rotating:
                without_rotation.append(key_id)
        status = "PASSED" if not without_rotation else "WARNING"
        return [IntegrationFinding(
            check_id="aws.kms.key_rotation",
            title=(f"{len(without_rotation)} of {customer_keys} customer KMS keys "
                   "do not rotate automatically" if without_rotation else
                   f"All {customer_keys} customer KMS keys rotate automatically"
                   if customer_keys else "No customer-managed KMS keys"),
            description=("Rotation disabled on: " + ", ".join(without_rotation[:20])
                         if without_rotation else
                         "Every enabled symmetric customer-managed key has "
                         "automatic rotation on."),
            remediation="KMS → customer managed keys → Key rotation → enable "
                        "automatic rotation.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="secret_management",
            result_details={"region": self._region,
                            "keys_without_rotation": without_rotation,
                            "customer_managed_keys": customer_keys},
        )]

    async def _check_guardduty(self) -> list[IntegrationFinding]:
        detectors = (await self._call("guardduty", "list_detectors")).get("DetectorIds", [])
        enabled: list[str] = []
        for detector_id in detectors:
            try:
                detail = await self._call("guardduty", "get_detector", DetectorId=detector_id)
            except Exception:  # noqa: BLE001
                continue
            if detail.get("Status") == "ENABLED":
                enabled.append(detector_id)
        status = "PASSED" if enabled else "FAILED"
        return [IntegrationFinding(
            check_id="aws.guardduty.enabled",
            title=(f"GuardDuty is enabled in {self._region}" if enabled
                   else f"GuardDuty is not enabled in {self._region}"),
            description=(f"GuardDuty detector active in {self._region}, so "
                         "credential misuse and reconnaissance produce findings "
                         "an incident process can act on."
                         if enabled else
                         f"No active GuardDuty detector in {self._region}. Threat "
                         "detection is the evidence an incident response control "
                         "relies on; without it there is nothing to respond to."),
            remediation="GuardDuty → Enable, ideally delegated from the "
                        "organisation's security account so coverage follows "
                        "new accounts automatically.",
            status=status,
            severity="INFO" if status == "PASSED" else "HIGH",
            check_category="incident_response",
            result_details={"region": self._region, "enabled_detectors": enabled},
        )]

    async def _check_backup_plans(self) -> list[IntegrationFinding]:
        plans = await self._paginate("backup", "list_backup_plans", "BackupPlansList")
        names = [p.get("BackupPlanName", "") for p in plans]
        status = "PASSED" if names else "WARNING"
        return [IntegrationFinding(
            check_id="aws.backup.plans",
            title=(f"{len(names)} AWS Backup plans in {self._region}" if names
                   else f"No AWS Backup plan in {self._region}"),
            description=("Backup plans: " + ", ".join(names[:20]) + "." if names else
                         f"No AWS Backup plan exists in {self._region}. Resources may "
                         "still be backed up by service-native means (RDS automated "
                         "backups, EBS lifecycle policies), which this check does "
                         "not see — confirm before treating it as a gap."),
            remediation="AWS Backup → Backup plans → create a plan with a "
                        "retention rule and assign resources to it.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="backup_recovery",
            result_details={"region": self._region, "plans": names},
        )]

    # ── helpers ─────────────────────────────────────────────────────────────

    async def _account(self) -> str:
        cached = getattr(self, "_account_id", "")
        if cached:
            return cached
        identity = await self._call("sts", "get_caller_identity")
        self._account_id = str(identity.get("Account", ""))
        return self._account_id
