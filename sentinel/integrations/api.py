# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""HTTP surface for connecting an integration.

This is the missing link between the catalogue in the browser and the sync
worker. Before it existed, the UI could create an ``integrations`` row but had
nowhere to send credentials, so a "connected" integration could never actually
collect anything.

Security invariants, in order of importance:

1. **Plaintext credentials never reach the database or a log.** They arrive
   over TLS, are encrypted here with AES-256-GCM
   (:mod:`sentinel.integrations.crypto`), and only the ciphertext blob is
   stored. Nothing in this module logs a credential value, and the error paths
   are written so a stack trace cannot carry one either.
2. **Only a slug with a shipped adapter is accepted.** The registry is the
   authority; a catalogued-only product is refused with an explanation rather
   than accepted into a queue that would drop it.
3. **The caller's org is taken from their verified token, never from the
   request body.** A client cannot connect an integration into someone else's
   organisation by editing a field.
4. **Enqueueing is privileged.** ``background_jobs`` has no client insert
   policy; this endpoint writes with the service role, which is exactly why the
   step belongs on the server.

Mounted by the FastAPI app; see ``sentinel/proxy.py``.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from sentinel.integrations.crypto import CredentialKeyMissing, encrypt_credentials
from sentinel.integrations.registry import available_slugs, get_adapter_class

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/integrations", tags=["integrations"])


class ConnectRequest(BaseModel):
    """Body of a connect call.

    ``org_id`` is deliberately absent: it comes from the caller's verified
    identity, never from the request, so a client cannot target another
    tenant.
    """

    catalog_slug: str = Field(..., min_length=1, max_length=64)
    # Values collected from the provider's `credentialFields`. Free-form
    # because each adapter declares its own shape, and validated by the
    # adapter's credentials class below.
    credentials: dict[str, Any]
    #: Optional display name; defaults to the catalogue entry's name.
    name: str | None = Field(default=None, max_length=200)


class ConnectResponse(BaseModel):
    integration_id: str
    status: str
    job_id: str | None
    message: str


async def _db() -> asyncpg.Connection:
    """Service-role connection. Required: enqueueing is a privileged write."""
    dsn = os.environ.get("SUPABASE_DB_URL") or os.environ.get("DATABASE_URL")
    if not dsn:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Integration backend is not configured (no database URL).",
        )
    return await asyncpg.connect(dsn)


_bearer = HTTPBearer()


async def resolve_org(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Resolve the caller's organisation from their verified bearer token.

    Reuses the proxy's existing tenant resolution rather than introducing a
    second way to authenticate — one auth path is easier to reason about and
    to audit. Kept as a dependency so tests can override it.
    """
    # Local import: proxy imports this router, so a module-level import cycles.
    from sentinel.proxy import _get_db, _resolve_tenant

    db = await _get_db()
    try:
        tenant = await _resolve_tenant(credentials, db)
    finally:
        close = getattr(db, "close", None)
        if close:
            await close()

    org_id = getattr(tenant, "tenant_id", None)
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not resolve to an organisation.",
        )
    return str(org_id)


@router.get("/available")
async def list_available() -> dict[str, list[str]]:
    """Slugs with a shipped adapter.

    The UI gates its Connect button on the catalogue's ``adapter_status``; this
    lets it cross-check against what the server will actually accept, so the
    two can never silently disagree.
    """
    return {"slugs": sorted(available_slugs())}


@router.post("/connect", response_model=ConnectResponse)
async def connect(body: ConnectRequest, org_id: str = Depends(resolve_org)) -> ConnectResponse:
    """Store encrypted credentials for an integration and queue its first sync."""
    slug = body.catalog_slug.strip().lower()

    # 1. Refuse a slug with no adapter. Accepting one would create a row that
    #    can never collect — the promise the catalogue is careful not to make.
    try:
        _adapter_cls, credentials_cls = get_adapter_class(slug)
    except LookupError as exc:  # registry raises LookupError, not KeyError
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

    # 2. Validate the credential shape with the adapter's own model, so a
    #    missing field is a clear 400 rather than a worker crash later.
    #    The exception is not chained: a pydantic error can echo input values.
    try:
        validated = credentials_cls(**body.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Credentials do not match what the {slug} adapter requires.",
        ) from None

    # 3. Encrypt. Never persist, log or echo the plaintext.
    try:
        payload = validated.model_dump() if hasattr(validated, "model_dump") else dict(body.credentials)
        blob = encrypt_credentials(payload)
    except CredentialKeyMissing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Credential encryption key is not configured on the server.",
        ) from None

    conn = await _db()
    try:
        async with conn.transaction():
            # 4. Upsert the org's instance. The unique index on
            #    (org_id, catalog_slug) makes reconnecting update in place
            #    rather than creating a duplicate.
            row = await conn.fetchrow(
                """
                INSERT INTO public.integrations
                    (org_id, name, provider, category, status, catalog_slug,
                     credentials_encrypted, direction, health)
                VALUES ($1, $2, $2, 'other', 'configuring', $3, $4, 'inbound', 'unknown')
                ON CONFLICT (org_id, catalog_slug) WHERE catalog_slug IS NOT NULL
                                                     AND is_deleted = false
                DO UPDATE SET credentials_encrypted = EXCLUDED.credentials_encrypted,
                              status                = 'configuring',
                              last_run_error        = NULL,
                              updated_at            = now()
                RETURNING id
                """,
                org_id,
                body.name or slug,
                slug,
                blob,
            )
            integration_id = str(row["id"])

            # 5. Queue the first sync. Client roles have no insert policy on
            #    background_jobs, which is why this happens here.
            job = await conn.fetchrow(
                """
                INSERT INTO public.background_jobs (org_id, job_type, payload)
                VALUES ($1, 'integration_sync',
                        jsonb_build_object('integration_id', $2::text, 'catalog_slug', $3::text))
                RETURNING id
                """,
                org_id,
                integration_id,
                slug,
            )
            job_id = str(job["id"])
    except asyncpg.PostgresError:
        # Deliberately not surfacing the driver message: it can quote the row,
        # and the row carries the credential blob.
        logger.exception("integration connect failed for slug=%s", slug)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the integration. Nothing was stored.",
        ) from None
    finally:
        await conn.close()

    logger.info("integration connected slug=%s org=%s job=%s", slug, org_id, job_id)
    return ConnectResponse(
        integration_id=integration_id,
        status="configuring",
        job_id=job_id,
        message="Credentials stored securely. The first sync has been queued.",
    )


@router.post("/{integration_id}/sync", response_model=ConnectResponse)
async def resync(integration_id: str, org_id: str = Depends(resolve_org)) -> ConnectResponse:
    """Queue another sync for an already-connected integration."""
    conn = await _db()
    try:
        row = await conn.fetchrow(
            """
            SELECT catalog_slug FROM public.integrations
             WHERE id = $1::uuid AND org_id = $2 AND is_deleted = false
            """,
            integration_id,
            org_id,
        )
        if not row or not row["catalog_slug"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No connected integration with that id in your organisation.",
            )
        if row["catalog_slug"] not in available_slugs():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No adapter ships for {row['catalog_slug']}; nothing to sync.",
            )
        job = await conn.fetchrow(
            """
            INSERT INTO public.background_jobs (org_id, job_type, payload)
            VALUES ($1, 'integration_sync',
                    jsonb_build_object('integration_id', $2::text, 'catalog_slug', $3::text))
            RETURNING id
            """,
            org_id,
            integration_id,
            row["catalog_slug"],
        )
    finally:
        await conn.close()

    return ConnectResponse(
        integration_id=integration_id,
        status="queued",
        job_id=str(job["id"]),
        message="Sync queued.",
    )
