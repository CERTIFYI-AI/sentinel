"""Tests for sentinel/layers/auditor.py and sentinel/storage/audit_store.py.

Inserts 100 entries, verifies full hash chain, corrupts one, checks detection,
and validates export_to_csv() output.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import uuid

from datetime import datetime, timezone

import pytest

from sentinel.layers.auditor import AuditEntryInput, log, verify_chain_integrity, export_to_csv


def _make_entry_input(tenant_id: str = "test-tenant-001") -> AuditEntryInput:
    """Build a minimal AuditEntryInput for testing."""
    return AuditEntryInput(
        tenant_id=tenant_id,
        request_id=str(uuid.uuid4()),
        prompt_hash="test prompt",
        response_hash="test response",
        trust_score=0.92,
        intervention_level=0,
        cost_usd=0.0002,
        latency_ms=312.5,
        metadata={"claim_scores": [], "sources": []},
    )


class TestHashChainIntegrity:
    """100-entry chain must be fully intact; corrupting one must be detected."""

    async def test_100_entries_chain_is_intact(self, db_conn):
        """Insert 100 sequential entries and assert verify_chain_integrity passes."""
        tenant_id = f"chain-test-{uuid.uuid4().hex[:8]}"
        for _ in range(100):
            await log(_make_entry_input(tenant_id=tenant_id), db_conn)
        report = await verify_chain_integrity(tenant_id=tenant_id, db=db_conn)
        assert report.intact, f"Chain broken at: {report.broken_at}"
        assert report.total_entries == 100
        assert len(report.broken_at) == 0

    async def test_corrupted_entry_is_detected(self, db_conn):
        """Manually overwrite one entry_hash in the DB; verify_chain_integrity
        must return that entry's ID in broken_at."""
        tenant_id = f"corrupt-test-{uuid.uuid4().hex[:8]}"
        entries = []
        for _ in range(10):
            entry = await log(_make_entry_input(tenant_id=tenant_id), db_conn)
            entries.append(entry)

        # Corrupt the 5th entry's hash directly in the database.
        target_entry_id = entries[4].entry_id
        await db_conn.execute(
            "UPDATE audit_log SET entry_hash = $1 WHERE entry_id = $2",
            "CORRUPTED_HASH_VALUE_THAT_WILL_NOT_VERIFY",
            str(target_entry_id),
        )
        report = await verify_chain_integrity(tenant_id=tenant_id, db=db_conn)
        assert not report.intact
        assert str(target_entry_id) in report.broken_at

    async def test_genesis_entry_hash_uses_tenant_seed(self, db_conn):
        """First entry's prev_hash must equal sha256(tenant_id + 'GENESIS')."""
        tenant_id = f"genesis-test-{uuid.uuid4().hex[:8]}"
        entry = await log(_make_entry_input(tenant_id=tenant_id), db_conn)
        expected_genesis = hashlib.sha256(
            f"{tenant_id}:GENESIS".encode()
        ).hexdigest()
        assert entry.prev_hash == expected_genesis


class TestAuditLogAppendOnly:
    """The auditor module exposes no update or delete functions."""

    def test_no_delete_function_exposed(self):
        import sentinel.layers.auditor as auditor_module
        assert not hasattr(auditor_module, "delete")
        assert not hasattr(auditor_module, "update")
        assert not hasattr(auditor_module, "delete_entry")

    def test_only_allowed_public_functions(self):
        import sentinel.layers.auditor as auditor_module
        public_fns = [
            name for name in dir(auditor_module)
            if not name.startswith("_")
            and callable(getattr(auditor_module, name))
        ]
        allowed = {"log", "verify_chain_integrity", "get_entries", "export_to_csv", "annotations",
                    "AuditEntryInput", "AuditEntry", "IntegrityReport"}
        # Ensure no unexpected write functions exist.
        for fn in public_fns:
            assert fn in allowed or fn[0].isupper(), (
                f"Unexpected public function '{fn}' in auditor module. "
                f"Auditor is append-only."
            )


class TestExportToCsv:
    """export_to_csv() must produce valid CSV with correct headers."""

    async def test_csv_has_correct_headers(self, db_conn):
        tenant_id = f"csv-test-{uuid.uuid4().hex[:8]}"
        for _ in range(5):
            await log(_make_entry_input(tenant_id=tenant_id), db_conn)

        csv_bytes: bytes = await export_to_csv(tenant_id=tenant_id, db=db_conn)
        reader = csv.DictReader(io.StringIO(csv_bytes.decode()))

        expected_headers = {
            "entry_id", "tenant_id", "request_id", "timestamp",
            "prompt_hash", "response_hash", "trust_score",
            "intervention_level", "cost_usd", "latency_ms",
            "prev_hash", "entry_hash",
        }
        assert set(reader.fieldnames or []) >= expected_headers

    async def test_csv_row_count_matches_entries(self, db_conn):
        tenant_id = f"csv-count-{uuid.uuid4().hex[:8]}"
        for _ in range(7):
            await log(_make_entry_input(tenant_id=tenant_id), db_conn)

        csv_bytes = await export_to_csv(tenant_id=tenant_id, db=db_conn)
        rows = list(csv.DictReader(io.StringIO(csv_bytes.decode())))
        assert len(rows) == 7

    async def test_csv_trust_scores_are_valid_floats(self, db_conn):
        tenant_id = f"csv-float-{uuid.uuid4().hex[:8]}"
        await log(_make_entry_input(tenant_id=tenant_id), db_conn)

        csv_bytes = await export_to_csv(tenant_id=tenant_id, db=db_conn)
        for row in csv.DictReader(io.StringIO(csv_bytes.decode())):
            score = float(row["trust_score"])
            assert 0.0 <= score <= 1.0
