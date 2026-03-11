"""Tests for sentinel.database module."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from sentinel.database import (
    AuditLogRepo,
    ApprovalRepo,
    FindingRepo,
    NotificationRepo,
    UserRepo,
)


TENANT = "00000000-0000-0000-0000-000000000001"
USER = "00000000-0000-0000-0000-000000000002"


# ---------------------------------------------------------------------------
# AuditLogRepo
# ---------------------------------------------------------------------------
class TestAuditLogRepo:
    @pytest.mark.asyncio
    async def test_append_returns_id(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetchrow.return_value = {"id": uuid.uuid4()}
        result = await AuditLogRepo.append(
            mock_db_conn, tenant_id=TENANT, actor="user@test.com", action="login"
        )
        assert result is not None
        mock_db_conn.fetchrow.assert_called_once()

    @pytest.mark.asyncio
    async def test_list_returns_tuple(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetch.return_value = []
        mock_db_conn.fetchval.return_value = 0
        items, total = await AuditLogRepo.list_(mock_db_conn, TENANT)
        assert items == []
        assert total == 0

    @pytest.mark.asyncio
    async def test_list_pagination(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetch.return_value = []
        mock_db_conn.fetchval.return_value = 100
        _, total = await AuditLogRepo.list_(mock_db_conn, TENANT, page=2, limit=25)
        assert total == 100


# ---------------------------------------------------------------------------
# UserRepo
# ---------------------------------------------------------------------------
class TestUserRepo:
    @pytest.mark.asyncio
    async def test_create_returns_id(self, mock_db_conn: AsyncMock) -> None:
        uid = uuid.uuid4()
        mock_db_conn.fetchrow.return_value = {"id": uid}
        result = await UserRepo.create(
            mock_db_conn,
            tenant_id=TENANT,
            email="test@example.com",
            password_hash="hashed",
        )
        assert result == str(uid)

    @pytest.mark.asyncio
    async def test_get_by_email_not_found(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetchrow.return_value = None
        result = await UserRepo.get_by_email(mock_db_conn, "no@exist.com")
        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetchrow.return_value = {"id": uuid.UUID(USER), "email": "a@b.com"}
        result = await UserRepo.get_by_id(mock_db_conn, USER)
        assert result is not None
        assert result["email"] == "a@b.com"


# ---------------------------------------------------------------------------
# NotificationRepo
# ---------------------------------------------------------------------------
class TestNotificationRepo:
    @pytest.mark.asyncio
    async def test_create(self, mock_db_conn: AsyncMock) -> None:
        nid = uuid.uuid4()
        mock_db_conn.fetchrow.return_value = {"id": nid}
        result = await NotificationRepo.create(
            mock_db_conn, tenant_id=TENANT, user_id=USER, message="Hello"
        )
        assert result == str(nid)

    @pytest.mark.asyncio
    async def test_unread_count(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetchval.return_value = 5
        count = await NotificationRepo.unread_count(mock_db_conn, USER)
        assert count == 5

    @pytest.mark.asyncio
    async def test_mark_read(self, mock_db_conn: AsyncMock) -> None:
        nid = str(uuid.uuid4())
        await NotificationRepo.mark_read(mock_db_conn, nid)
        mock_db_conn.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_mark_all_read(self, mock_db_conn: AsyncMock) -> None:
        await NotificationRepo.mark_all_read(mock_db_conn, USER)
        mock_db_conn.execute.assert_called_once()


# ---------------------------------------------------------------------------
# FindingRepo
# ---------------------------------------------------------------------------
class TestFindingRepo:
    @pytest.mark.asyncio
    async def test_list_empty(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetch.return_value = []
        items = await FindingRepo.list_(mock_db_conn, TENANT)
        assert items == []

    @pytest.mark.asyncio
    async def test_get_not_found(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetchrow.return_value = None
        result = await FindingRepo.get(mock_db_conn, str(uuid.uuid4()))
        assert result is None


# ---------------------------------------------------------------------------
# ApprovalRepo
# ---------------------------------------------------------------------------
class TestApprovalRepo:
    @pytest.mark.asyncio
    async def test_list_empty(self, mock_db_conn: AsyncMock) -> None:
        mock_db_conn.fetch.return_value = []
        items = await ApprovalRepo.list_(mock_db_conn, TENANT)
        assert items == []

    @pytest.mark.asyncio
    async def test_decide(self, mock_db_conn: AsyncMock) -> None:
        aid = uuid.uuid4()
        mock_db_conn.fetchrow.return_value = {"id": aid, "status": "approved"}
        result = await ApprovalRepo.decide(
            mock_db_conn,
            str(aid),
            status="approved",
            decided_by="admin@test.com",
        )
        assert result is not None
        assert result["status"] == "approved"
