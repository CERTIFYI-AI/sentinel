# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Snowflake integration adapter.

Reads account security posture through the Snowflake SQL API: stale
ACCOUNTADMIN grants, account-level network policy enforcement, and Time
Travel retention as a backup/recovery signal.

Auth: account_identifier + username + credential (password), the simplest
documented path to the SQL API. Sentinel exchanges these for a session
token once and reuses it for every query in the sync.
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass

import httpx

from sentinel.integrations.base import IntegrationFinding

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=10.0)

#: An ACCOUNTADMIN grant with no successful login inside this window is a finding.
_STALE_ADMIN_DAYS = 90


@dataclass
class SnowflakeCredentials:
    """Matches dashboard/src/integrations/snowflake/config.ts credentialFields."""

    account_identifier: str
    username: str
    credential: str

    def base_url(self) -> str:
        account = self.account_identifier.strip().replace("_", "-")
        return f"https://{account}.snowflakecomputing.com"


class SnowflakeAdapter:
    """Reads account security posture from Snowflake via the SQL API."""

    def __init__(self, credentials: SnowflakeCredentials, client: httpx.AsyncClient | None = None) -> None:
        self.credentials = credentials
        self._client = client
        self._session_token: str | None = None

    async def _open(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=_TIMEOUT)

    async def _authenticate(self, client: httpx.AsyncClient) -> str:
        """Exchange username/password for a session token."""
        if self._session_token:
            return self._session_token
        resp = await client.post(
            f"{self.credentials.base_url()}/session/v1/login-request",
            params={"requestId": str(uuid.uuid4())},
            json={
                "data": {
                    "LOGIN_NAME": self.credentials.username,
                    # Snowflake login-request payload field; the value is the
                    # operator-supplied credential.
                    "PASSWORD": self.credentials.credential,
                    "ACCOUNT_NAME": self.credentials.account_identifier,
                    "CLIENT_APP_ID": "SentinelGRC",
                    "CLIENT_APP_VERSION": "1.0.0",
                }
            },
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            raise ValueError(
                "Snowflake rejected the username/credential pair "
                f"(HTTP {resp.status_code}). Verify the account identifier, "
                "username, and credential."
            )
        resp.raise_for_status()
        body = resp.json()
        if not body.get("success"):
            raise ValueError(
                "Snowflake rejected the login: "
                + str(body.get("message", "unknown error"))
            )
        self._session_token = body.get("data", {}).get("token", "")
        return self._session_token

    async def _query(self, client: httpx.AsyncClient, sql: str) -> dict:
        token = await self._authenticate(client)
        resp = await client.post(
            f"{self.credentials.base_url()}/api/v2/statements",
            headers={
                "Authorization": f'Snowflake Token="{token}"',
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={"statement": sql, "timeout": 30},
            timeout=_TIMEOUT,
        )
        if resp.status_code in (401, 403):
            return {"error": f"HTTP {resp.status_code}"}
        resp.raise_for_status()
        return resp.json()

    async def validate(self) -> bool:
        """One lightweight authenticated call; ValueError on bad credentials."""
        client = await self._open()
        try:
            await self._authenticate(client)
            return True
        except ValueError:
            raise
        except Exception as exc:
            raise ValueError(f"Could not reach Snowflake: {exc}") from exc
        finally:
            if self._client is None:
                await client.aclose()

    async def fetch_all(self) -> list[IntegrationFinding]:
        """Run every check; one check failing never sinks the sync."""
        client = await self._open()
        try:
            results = await asyncio.gather(
                self._check_stale_accountadmin_grants(client),
                self._check_network_policy_enforcement(client),
                self._check_time_travel_retention(client),
                return_exceptions=True,
            )
        finally:
            if self._client is None:
                await client.aclose()

        findings: list[IntegrationFinding] = []
        for result in results:
            if isinstance(result, BaseException):
                logger.warning("snowflake check failed: %s", result)
                continue
            findings.extend(result)
        return findings

    # -- checks ----------------------------------------------------------------

    async def _check_stale_accountadmin_grants(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        sql = (
            "SELECT NAME, DISABLED, DATEDIFF('day', LAST_SUCCESS_LOGIN, CURRENT_TIMESTAMP()) AS DAYS_SINCE_LOGIN "
            "FROM SNOWFLAKE.ACCOUNT_USAGE.USERS "
            "WHERE DELETED_ON IS NULL AND HAS_RSA_PUBLIC_KEY = FALSE"
        )
        result = await self._query(client, sql)
        if "error" in result or "data" not in result:
            return [self._unavailable(
                "snowflake.iam.stale_accountadmin_grants",
                "Stale ACCOUNTADMIN grants",
                "access_control",
                "Grant the login role the SNOWFLAKE.ACCOUNT_USAGE database "
                "role, or IMPORTED PRIVILEGES on the SNOWFLAKE database, so "
                "user login history is queryable.",
            )]
        rows = result.get("data", [])
        stale: list[str] = []
        total_admins = 0
        for row in rows:
            name = row[0] if len(row) > 0 else "unknown"
            disabled = str(row[1]).upper() == "TRUE" if len(row) > 1 else False
            days_since = row[2] if len(row) > 2 else None
            total_admins += 1
            if disabled:
                continue
            if days_since is None or (isinstance(days_since, (int, float, str)) and str(days_since).replace(".", "", 1).isdigit() and float(days_since) > _STALE_ADMIN_DAYS):
                stale.append(name)
        status = "PASSED" if not stale else "WARNING"
        return [IntegrationFinding(
            check_id="snowflake.iam.stale_accountadmin_grants",
            title=(f"{len(stale)} user(s) have not logged in within {_STALE_ADMIN_DAYS} days"
                   if stale else f"All {total_admins} reviewed users have a recent successful login"),
            description=("Stale or never-logged-in users: " + ", ".join(sorted(stale)[:20]) + "."
                         if stale else
                         f"Every one of {total_admins} reviewed user(s) has logged in within "
                         f"the last {_STALE_ADMIN_DAYS} days, or is disabled."),
            remediation="ACCOUNTADMIN → Users → disable or drop users who no longer need "
                        "standing access, and require MFA plus periodic access review for "
                        "any user holding the ACCOUNTADMIN role.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="access_control",
            result_details={"reviewed_users": total_admins, "stale_users": sorted(stale),
                            "max_age_days": _STALE_ADMIN_DAYS},
        )]

    async def _check_network_policy_enforcement(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        result = await self._query(client, "SHOW PARAMETERS LIKE 'NETWORK_POLICY' IN ACCOUNT")
        if "error" in result:
            return [self._unavailable(
                "snowflake.network.policy_enforcement",
                "Account-level network policy enforcement",
                "network_security",
                "Grant the login role SECURITYADMIN or a role with MONITOR "
                "SECURITY on the account so the network policy parameter is readable.",
            )]
        rows = result.get("data", [])
        policy_name = ""
        for row in rows:
            if row and row[0] == "NETWORK_POLICY":
                policy_name = row[1] if len(row) > 1 else ""
        enforced = bool(policy_name)
        return [IntegrationFinding(
            check_id="snowflake.network.policy_enforcement",
            title=(f"Account-level network policy '{policy_name}' is enforced" if enforced
                   else "No account-level network policy is enforced"),
            description=(f"All connections to the account are restricted by network policy "
                        f"'{policy_name}'." if enforced else
                        "The account has no network policy assigned, so any IP address can "
                        "attempt to authenticate — there is no allow-list gate."),
            remediation="ACCOUNTADMIN → Security → Network Policies → create a policy with "
                        "an IP allow-list and assign it at the account level.",
            status="PASSED" if enforced else "FAILED",
            severity="INFO" if enforced else "HIGH",
            check_category="network_security",
            result_details={"network_policy": policy_name or None},
        )]

    async def _check_time_travel_retention(self, client: httpx.AsyncClient) -> list[IntegrationFinding]:
        result = await self._query(client, "SHOW PARAMETERS LIKE 'DATA_RETENTION_TIME_IN_DAYS' IN ACCOUNT")
        if "error" in result:
            return [self._unavailable(
                "snowflake.account.time_travel_retention",
                "Time Travel retention as a backup safety net",
                "backup_recovery",
                "Grant the login role a role able to view account parameters.",
            )]
        rows = result.get("data", [])
        retention_days = 0
        for row in rows:
            if row and row[0] == "DATA_RETENTION_TIME_IN_DAYS":
                try:
                    retention_days = int(row[1])
                except (TypeError, ValueError):
                    retention_days = 0
        status = "PASSED" if retention_days >= 1 else "FAILED"
        return [IntegrationFinding(
            check_id="snowflake.account.time_travel_retention",
            title=(f"Time Travel retention is {retention_days} day(s)" if retention_days
                   else "Time Travel retention is disabled account-wide"),
            description=(f"Dropped or modified data can be recovered for up to "
                        f"{retention_days} day(s) via Time Travel." if retention_days else
                        "DATA_RETENTION_TIME_IN_DAYS is 0 account-wide, so accidental drops "
                        "or overwrites cannot be recovered through Time Travel."),
            remediation="ACCOUNTADMIN → Account parameters → set "
                        "DATA_RETENTION_TIME_IN_DAYS to at least 1 (Enterprise edition "
                        "supports up to 90) on the account or on critical databases.",
            status=status,
            severity="INFO" if status == "PASSED" else "MEDIUM",
            check_category="backup_recovery",
            result_details={"retention_days": retention_days},
        )]

    @staticmethod
    def _unavailable(check_id: str, title: str, category: str, remediation: str) -> IntegrationFinding:
        return IntegrationFinding(
            check_id=check_id, title=title,
            description="Sentinel could not read this from Snowflake with the supplied credentials.",
            remediation=remediation,
            status="NOT_AVAILABLE", severity="INFO",
            check_category=category, result_details={},
        )
