"""Policy event emitters for Sentinel event bus."""
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def emit_policy_created(policy_id: str, tenant_id: str, name: str):
    logger.info(f"[EVENT] policy.created: {policy_id} tenant={tenant_id} name={name}")

async def emit_policy_approved(policy_id: str, tenant_id: str, approved_by: str):
    logger.info(f"[EVENT] policy.approved: {policy_id} tenant={tenant_id} by={approved_by}")

async def emit_policy_rejected(policy_id: str, tenant_id: str, rejected_by: str, reason: str):
    logger.info(f"[EVENT] policy.rejected: {policy_id} tenant={tenant_id} by={rejected_by} reason={reason}")

async def emit_policy_signed(policy_id: str, tenant_id: str, signer: str):
    logger.info(f"[EVENT] policy.signed: {policy_id} tenant={tenant_id} signer={signer}")

async def emit_policy_review_due(policy_id: str, tenant_id: str, due_date: str):
    logger.info(f"[EVENT] policy.review_due: {policy_id} tenant={tenant_id} due={due_date}")
