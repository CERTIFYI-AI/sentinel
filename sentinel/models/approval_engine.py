"""
sentinel/models/approval_engine.py
=====================================
Certifyi Sentinel — 4-Role Sequential Approval Engine

Approval chain (order enforced — cannot skip a stage):
  Stage 1: AI_ENGINEER    — technical sign-off
  Stage 2: DEVELOPER      — integration sign-off
  Stage 3: COMPLIANCE     — regulatory sign-off
  Stage 4: AI_GOV_BOARD   — governance board final approval

Rules:
  - Stage N cannot move to IN_REVIEW until Stage N-1 is APPROVED
  - All required checklist items must be TRUE before APPROVE decision is accepted
  - Any REJECT at any stage sets approval status to REJECTED — all remaining stages SKIPPED
  - Rejection sends the model back to the requester with a mandatory reason
  - REQUEST_CHANGES reverts current stage to IN_REVIEW without rejecting the whole approval
  - Only the assigned reviewer for the current stage may submit a decision
  - Gov board members can observe all stages at any time (read-only on earlier stages)
  - Approvals expire after 30 days if not completed — auto-set WITHDRAWN
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

STAGE_ROLES = ["AI_ENGINEER", "DEVELOPER", "COMPLIANCE", "AI_GOV_BOARD"]
ROLE_LABELS = {
    "AI_ENGINEER":  "AI Engineer",
    "DEVELOPER":    "Developer",
    "COMPLIANCE":   "Compliance",
    "AI_GOV_BOARD": "AI Governance Board",
}

APPROVAL_EXPIRY_DAYS = 30

TRANSITION_TYPE_MAP = {
    ("DRAFT",       "STAGING"):     "DRAFT_TO_STAGING",
    ("STAGING",     "PRODUCTION"):  "STAGING_TO_PRODUCTION",
    ("PRODUCTION",  "DEPRECATED"):  "PRODUCTION_TO_DEPRECATED",
    ("DEPRECATED",  "RETIRED"):     "DEPRECATED_TO_RETIRED",
}


class ApprovalEngine:
    """
    All methods require an asyncpg connection (db) injected per call.
    Never stored on the engine instance.
    """

    # ── Creation ───────────────────────────────────────────────────────────────

    async def request_approval(
        self,
        tenant_id: str,
        model_id: str,
        model_name: str,
        from_stage: str,
        to_stage: str,
        requested_by: str,
        notes: Optional[str],
        assignees: dict[str, str],  # {role: user_id}
        db: Any,
    ) -> dict:
        """
        Create a new approval request with all 4 stage review rows.
        assignees = {"AI_ENGINEER": "uid1", "DEVELOPER": "uid2", ...}
        All 4 roles must be assigned at creation (enforces accountability).
        Returns the new approval record as a dict.
        """
        # Validate all 4 roles are assigned
        missing = [r for r in STAGE_ROLES if not assignees.get(r)]
        if missing:
            raise ValueError(
                f"All 4 roles must be assigned before requesting approval. "
                f"Missing: {', '.join(missing)}"
            )

        # Check for existing open approval on this model
        existing = await db.fetchrow(
            "SELECT id FROM model_approvals "
            "WHERE tenant_id = $1 AND model_id = $2 AND status IN ('PENDING','IN_REVIEW')",
            tenant_id, model_id,
        )
        if existing:
            raise ValueError(
                f"Model {model_name} already has an open approval request "
                f"({existing['id']}). Close or withdraw it before requesting another."
            )

        approval_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        expires = now + timedelta(days=APPROVAL_EXPIRY_DAYS)

        await db.execute(
            """
            INSERT INTO model_approvals (
                id, tenant_id, model_id, model_name,
                from_stage, to_stage, status, current_stage_index,
                requested_by, requested_at, expires_at, notes,
                ai_engineer_id, developer_id, compliance_id, gov_board_id
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, 'PENDING', 1,
                $7, $8, $9, $10,
                $11, $12, $13, $14
            )
            """,
            approval_id, tenant_id, str(model_id), model_name,
            from_stage, to_stage,
            requested_by, now, expires, notes,
            assignees["AI_ENGINEER"], assignees["DEVELOPER"],
            assignees["COMPLIANCE"], assignees["AI_GOV_BOARD"],
        )

        # Create all 4 stage review rows — stage 1 starts IN_REVIEW immediately
        for i, role in enumerate(STAGE_ROLES, start=1):
            initial_status = "IN_REVIEW" if i == 1 else "PENDING"
            started_at = now if i == 1 else None
            await db.execute(
                """
                INSERT INTO approval_stage_reviews (
                    id, tenant_id, approval_id, stage_index, role,
                    status, assigned_to, checklist_state, started_at
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4,
                    $5, $6, '{}', $7
                )
                """,
                tenant_id, approval_id, i, role,
                initial_status, assignees[role], started_at,
            )

        # Update roadmap phase to link this approval
        await db.execute(
            """
            UPDATE roadmap_phases SET approval_id = $1, updated_at = NOW()
            WHERE tenant_id = $2 AND model_id = $3 AND phase = $4
            """,
            approval_id, tenant_id, str(model_id), to_stage,
        )

        # Emit event
        try:
            from sentinel.events.emitters import emit_approval_requested
            import asyncio
            asyncio.create_task(emit_approval_requested(
                tenant_id=tenant_id, approval_id=approval_id,
                model_name=model_name, to_stage=to_stage,
                first_reviewer_id=assignees["AI_ENGINEER"],
            ))
        except Exception:
            pass

        return await self._get_approval(approval_id, tenant_id, db)

    # ── Checklist update ───────────────────────────────────────────────────────

    async def update_checklist(
        self,
        approval_id: str,
        stage_index: int,
        item_id: str,
        checked: bool,
        actor_id: str,
        tenant_id: str,
        db: Any,
    ) -> dict:
        """
        Toggle a checklist item for the current stage.
        Only the assigned reviewer for the stage may update their checklist.
        """
        review = await self._get_stage_review(approval_id, stage_index, tenant_id, db)
        self._assert_reviewer(review, actor_id, stage_index)
        if review["status"] != "IN_REVIEW":
            raise ValueError(f"Stage {stage_index} is not IN_REVIEW — cannot update checklist.")

        # Merge into existing JSONB state
        state = dict(review["checklist_state"] or {})
        state[item_id] = checked
        await db.execute(
            "UPDATE approval_stage_reviews SET checklist_state = $1::jsonb "
            "WHERE approval_id = $2 AND stage_index = $3 AND tenant_id = $4",
            __import__("json").dumps(state), approval_id, stage_index, tenant_id,
        )
        return state

    # ── Decisions ─────────────────────────────────────────────────────────────

    async def approve_stage(
        self,
        approval_id: str,
        stage_index: int,
        note: str,
        actor_id: str,
        tenant_id: str,
        db: Any,
    ) -> dict:
        """
        APPROVE the current stage.
        Validates all required checklist items are checked.
        Advances to next stage or marks approval APPROVED if final stage.
        """
        review = await self._get_stage_review(approval_id, stage_index, tenant_id, db)
        self._assert_reviewer(review, actor_id, stage_index)
        if review["status"] != "IN_REVIEW":
            raise ValueError(f"Stage {stage_index} is not IN_REVIEW.")

        # Checklist validation
        approval = await self._get_approval(approval_id, tenant_id, db)
        transition_type = TRANSITION_TYPE_MAP.get(
            (approval["from_stage"], approval["to_stage"])
        )
        if transition_type:
            await self._validate_checklist(
                approval_id, stage_index, STAGE_ROLES[stage_index - 1],
                transition_type, review["checklist_state"] or {}, tenant_id, db
            )

        now = datetime.now(timezone.utc)
        await db.execute(
            """
            UPDATE approval_stage_reviews
            SET status = 'APPROVED', decision = 'APPROVE', decision_note = $1,
                reviewed_by = $2, reviewed_at = $3
            WHERE approval_id = $4 AND stage_index = $5 AND tenant_id = $6
            """,
            note, actor_id, now, approval_id, stage_index, tenant_id,
        )

        if stage_index < 4:
            # Advance to next stage
            next_idx = stage_index + 1
            await db.execute(
                """
                UPDATE approval_stage_reviews
                SET status = 'IN_REVIEW', started_at = $1
                WHERE approval_id = $2 AND stage_index = $3 AND tenant_id = $4
                """,
                now, approval_id, next_idx, tenant_id,
            )
            await db.execute(
                "UPDATE model_approvals SET status = 'IN_REVIEW', current_stage_index = $1 "
                "WHERE id = $2 AND tenant_id = $3",
                next_idx, approval_id, tenant_id,
            )
            # Notify next reviewer
            next_review = await self._get_stage_review(approval_id, next_idx, tenant_id, db)
            try:
                from sentinel.events.emitters import emit_approval_stage_advanced
                import asyncio
                asyncio.create_task(emit_approval_stage_advanced(
                    tenant_id=tenant_id, approval_id=approval_id,
                    stage_index=next_idx, reviewer_id=next_review["assigned_to"],
                    model_name=approval["model_name"],
                ))
            except Exception:
                pass
        else:
            # Final stage approved — mark whole approval APPROVED
            await db.execute(
                "UPDATE model_approvals SET status = 'APPROVED', completed_at = $1 "
                "WHERE id = $2 AND tenant_id = $3",
                now, approval_id, tenant_id,
            )
            # Advance model lifecycle stage
            await self._apply_lifecycle_transition(approval, tenant_id, db)
            try:
                from sentinel.events.emitters import emit_approval_completed
                import asyncio
                asyncio.create_task(emit_approval_completed(
                    tenant_id=tenant_id, approval_id=approval_id,
                    model_name=approval["model_name"], to_stage=approval["to_stage"],
                ))
            except Exception:
                pass

        return await self._get_approval(approval_id, tenant_id, db)

    async def reject_stage(
        self,
        approval_id: str,
        stage_index: int,
        reason: str,
        actor_id: str,
        tenant_id: str,
        db: Any,
    ) -> dict:
        """
        REJECT at the current stage.
        Marks the whole approval REJECTED. All remaining stages skipped.
        Model stays at from_stage.
        """
        if not reason or len(reason.strip()) < 10:
            raise ValueError("Rejection reason must be at least 10 characters.")

        review = await self._get_stage_review(approval_id, stage_index, tenant_id, db)
        self._assert_reviewer(review, actor_id, stage_index)
        if review["status"] != "IN_REVIEW":
            raise ValueError(f"Stage {stage_index} is not IN_REVIEW.")

        now = datetime.now(timezone.utc)
        await db.execute(
            """
            UPDATE approval_stage_reviews
            SET status = 'REJECTED', decision = 'REJECT', decision_note = $1,
                reviewed_by = $2, reviewed_at = $3
            WHERE approval_id = $4 AND stage_index = $5 AND tenant_id = $6
            """,
            reason, actor_id, now, approval_id, stage_index, tenant_id,
        )

        # Skip all remaining stages
        await db.execute(
            "UPDATE approval_stage_reviews SET status = 'SKIPPED' "
            "WHERE approval_id = $1 AND stage_index > $2 AND tenant_id = $3",
            approval_id, stage_index, tenant_id,
        )

        await db.execute(
            """
            UPDATE model_approvals
            SET status = 'REJECTED', completed_at = $1,
                rejection_stage = $2, rejection_reason = $3
            WHERE id = $4 AND tenant_id = $5
            """,
            now, STAGE_ROLES[stage_index - 1], reason, approval_id, tenant_id,
        )

        approval = await self._get_approval(approval_id, tenant_id, db)
        try:
            from sentinel.events.emitters import emit_approval_rejected
            import asyncio
            asyncio.create_task(emit_approval_rejected(
                tenant_id=tenant_id, approval_id=approval_id,
                model_name=approval["model_name"], rejected_by_role=STAGE_ROLES[stage_index - 1],
                reason=reason, requester_id=approval["requested_by"],
            ))
        except Exception:
            pass

        return approval

    async def request_changes(
        self,
        approval_id: str,
        stage_index: int,
        note: str,
        actor_id: str,
        tenant_id: str,
        db: Any,
    ) -> dict:
        """
        REQUEST_CHANGES: reviewer flags issues but does not reject entirely.
        Stage remains IN_REVIEW. Requester is notified to address feedback.
        """
        review = await self._get_stage_review(approval_id, stage_index, tenant_id, db)
        self._assert_reviewer(review, actor_id, stage_index)
        if review["status"] != "IN_REVIEW":
            raise ValueError(f"Stage {stage_index} is not IN_REVIEW.")

        # Add comment with the change request note
        await db.execute(
            "INSERT INTO approval_comments (tenant_id, approval_id, stage_index, author_id, body) "
            "VALUES ($1, $2, $3, $4, $5)",
            tenant_id, approval_id, stage_index, actor_id,
            f"[CHANGES REQUESTED] {note}",
        )
        # Update decision_note but keep status IN_REVIEW
        await db.execute(
            "UPDATE approval_stage_reviews SET decision = 'REQUEST_CHANGES', decision_note = $1 "
            "WHERE approval_id = $2 AND stage_index = $3 AND tenant_id = $4",
            note, approval_id, stage_index, tenant_id,
        )
        return await self._get_approval(approval_id, tenant_id, db)

    async def withdraw(
        self,
        approval_id: str,
        reason: str,
        actor_id: str,
        tenant_id: str,
        db: Any,
    ) -> dict:
        """
        Requester withdraws the approval request. Only the requester can withdraw.
        Approval status set to WITHDRAWN. All stages skipped.
        """
        approval = await self._get_approval(approval_id, tenant_id, db)
        if approval["requested_by"] != actor_id:
            raise ValueError("Only the original requester may withdraw an approval request.")
        if approval["status"] not in ("PENDING", "IN_REVIEW"):
            raise ValueError(f"Cannot withdraw an approval in status {approval['status']}.")

        now = datetime.now(timezone.utc)
        await db.execute(
            "UPDATE model_approvals SET status = 'WITHDRAWN', completed_at = $1, notes = $2 "
            "WHERE id = $3 AND tenant_id = $4",
            now, f"WITHDRAWN by {actor_id}: {reason}", approval_id, tenant_id,
        )
        await db.execute(
            "UPDATE approval_stage_reviews SET status = 'SKIPPED' "
            "WHERE approval_id = $1 AND status IN ('PENDING', 'IN_REVIEW') AND tenant_id = $2",
            approval_id, tenant_id,
        )
        return await self._get_approval(approval_id, tenant_id, db)

    async def reassign_stage(
        self,
        approval_id: str,
        stage_index: int,
        new_assignee_id: str,
        reason: str,
        actor_id: str,
        tenant_id: str,
        db: Any,
    ) -> None:
        """Reassign a stage review to a different user (before it's been decided)."""
        review = await self._get_stage_review(approval_id, stage_index, tenant_id, db)
        if review["status"] in ("APPROVED", "REJECTED", "SKIPPED"):
            raise ValueError(f"Stage {stage_index} already decided — cannot reassign.")

        col = {1: "ai_engineer_id", 2: "developer_id", 3: "compliance_id", 4: "gov_board_id"}[stage_index]
        await db.execute(
            f"UPDATE model_approvals SET {col} = $1 WHERE id = $2 AND tenant_id = $3",
            new_assignee_id, approval_id, tenant_id,
        )
        await db.execute(
            "UPDATE approval_stage_reviews SET assigned_to = $1 "
            "WHERE approval_id = $2 AND stage_index = $3 AND tenant_id = $4",
            new_assignee_id, approval_id, stage_index, tenant_id,
        )
        await db.execute(
            "INSERT INTO approval_comments (tenant_id, approval_id, stage_index, author_id, body) "
            "VALUES ($1, $2, $3, $4, $5)",
            tenant_id, approval_id, stage_index, actor_id,
            f"[REASSIGNED to {new_assignee_id}] {reason}",
        )

    # ── Internal helpers ───────────────────────────────────────────────────────

    async def _get_approval(self, approval_id: str, tenant_id: str, db: Any) -> dict:
        row = await db.fetchrow(
            "SELECT * FROM model_approvals WHERE id = $1 AND tenant_id = $2",
            approval_id, tenant_id,
        )
        if not row:
            raise ValueError(f"Approval {approval_id} not found.")
        d = dict(row)
        for k, v in d.items():
            if hasattr(v, "isoformat"):
                d[k] = v.isoformat()
        return d

    async def _get_stage_review(
        self, approval_id: str, stage_index: int, tenant_id: str, db: Any
    ) -> dict:
        row = await db.fetchrow(
            "SELECT * FROM approval_stage_reviews "
            "WHERE approval_id = $1 AND stage_index = $2 AND tenant_id = $3",
            approval_id, stage_index, tenant_id,
        )
        if not row:
            raise ValueError(f"Stage {stage_index} review not found for approval {approval_id}.")
        return dict(row)

    def _assert_reviewer(self, review: dict, actor_id: str, stage_index: int) -> None:
        if review["assigned_to"] != actor_id:
            raise PermissionError(
                f"Stage {stage_index} is assigned to {review['assigned_to']}. "
                f"User {actor_id} is not authorised to review this stage."
            )

    async def _validate_checklist(
        self,
        approval_id: str,
        stage_index: int,
        role: str,
        transition_type: str,
        checklist_state: dict,
        tenant_id: str,
        db: Any,
    ) -> None:
        """Raise ValueError if any required checklist item is not checked."""
        required_items = await db.fetch(
            """
            SELECT id::text, item_text FROM approval_checklist_items
            WHERE (tenant_id = 'system' OR tenant_id = $1)
              AND transition_type = $2 AND role = $3 AND is_required = TRUE
            ORDER BY sort_order
            """,
            tenant_id, transition_type, role,
        )
        unchecked = [
            r["item_text"] for r in required_items
            if not checklist_state.get(str(r["id"]), False)
        ]
        if unchecked:
            raise ValueError(
                f"Cannot approve: {len(unchecked)} required checklist item(s) not confirmed:\n"
                + "\n".join(f"  • {item}" for item in unchecked[:5])
                + ("\n  ..." if len(unchecked) > 5 else "")
            )

    async def _apply_lifecycle_transition(
        self, approval: dict, tenant_id: str, db: Any
    ) -> None:
        """
        After full approval, advance the model's lifecycle stage in model_inventory.
        Also completes the roadmap phase.
        """
        try:
            await db.execute(
                "UPDATE model_inventory SET lifecycle_stage = $1, updated_at = NOW() "
                "WHERE id = $2 AND tenant_id = $3",
                approval["to_stage"], approval["model_id"], tenant_id,
            )
        except Exception:
            pass  # model_inventory table name may vary — non-fatal

        # Mark from_stage roadmap phase as COMPLETE, to_stage as ACTIVE
        now = datetime.now(timezone.utc).date().isoformat()
        await db.execute(
            "UPDATE roadmap_phases SET status = 'COMPLETE', actual_end = $1, updated_at = NOW() "
            "WHERE tenant_id = $2 AND model_id = $3 AND phase = $4",
            now, tenant_id, approval["model_id"], approval["from_stage"],
        )
        await db.execute(
            "UPDATE roadmap_phases SET status = 'ACTIVE', actual_start = $1, updated_at = NOW() "
            "WHERE tenant_id = $2 AND model_id = $3 AND phase = $4",
            now, tenant_id, approval["model_id"], approval["to_stage"],
        )
