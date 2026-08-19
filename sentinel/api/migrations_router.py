"""
Migration runner endpoint.
POST /api/migrate with {service_role_key: string} to apply the core GRC tables
to the configured Supabase project.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import ipaddress, logging, os, httpx, pathlib

logger = logging.getLogger(__name__)
router = APIRouter()

_ALLOWED_NETS_RAW = os.environ.get(
    "MIGRATE_ALLOWED_CIDRS", "127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
)
_ALLOWED_NETS = [
    ipaddress.ip_network(n.strip(), strict=False)
    for n in _ALLOWED_NETS_RAW.split(",") if n.strip()
]


def _check_ip(request: Request) -> None:
    client = request.client
    if not client:
        raise HTTPException(403, "no_client_address")
    try:
        addr = ipaddress.ip_address(client.host)
    except ValueError:
        raise HTTPException(403, "invalid_client_address")
    if not any(addr in net for net in _ALLOWED_NETS):
        logger.warning("migrate request denied from %s", addr)
        raise HTTPException(403, "ip_not_allowed")


class MigrateRequest(BaseModel):
    service_role_key: str
    dry_run: bool = False

@router.post("")
async def run_migration(body: MigrateRequest, request: Request):
    _check_ip(request)
    supabase_url = os.environ.get("VITE_SUPABASE_URL", "")
    if not supabase_url:
        raise HTTPException(400, "VITE_SUPABASE_URL not configured")
    
    sql_file = pathlib.Path("supabase/migrations/20260418000002_core_grc_tables.sql")
    if not sql_file.exists():
        raise HTTPException(404, "Migration SQL file not found")
    
    sql = sql_file.read_text()
    
    if body.dry_run:
        return {
            "success": True,
            "dry_run": True,
            "sql_length": len(sql),
            "sql_preview": sql[:500] + "...",
            "message": "Dry run complete — SQL not executed"
        }
    
    # Execute via Supabase REST API using service role key
    db_url = f"{supabase_url}/rest/v1/rpc/exec_sql"
    
    # Try the pg_query approach first, then fall back to splitting statements
    statements = [s.strip() for s in sql.split(';') if s.strip() and not s.strip().startswith('--')]
    
    headers = {
        "apikey": body.service_role_key,
        "Authorization": f"Bearer {body.service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    
    succeeded = 0
    failed = 0
    errors = []
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        for stmt in statements[:200]:  # cap at 200 statements
            try:
                resp = await client.post(
                    f"{supabase_url}/rest/v1/rpc/exec_sql",
                    json={"sql": stmt + ";"},
                    headers=headers,
                )
                if resp.status_code in (200, 201, 204):
                    succeeded += 1
                elif resp.status_code == 401:
                    raise HTTPException(401, "Invalid service role key — check Supabase dashboard > Project Settings > API > service_role")
                else:
                    failed += 1
                    errors.append(f"Statement failed (HTTP {resp.status_code})")
            except HTTPException:
                raise
            except Exception:
                failed += 1
                errors.append("statement_execution_error")
    
    return {
        "success": True,
        "succeeded": succeeded,
        "failed": failed,
        "total": len(statements),
        "errors": errors[:10],
        "message": f"Migration complete: {succeeded} succeeded, {failed} failed"
    }

@router.get("/status")
async def migration_status(request: Request):
    """Check which tables exist in Supabase via anon key (SELECT only)."""
    _check_ip(request)
    supabase_url = os.environ.get("VITE_SUPABASE_URL", "")
    anon_key = os.environ.get("VITE_SUPABASE_ANON_KEY", "")
    
    if not supabase_url or not anon_key:
        return {"configured": False, "message": "Supabase not configured"}
    
    tables = [
        "risks", "model_inventory", "incidents", "controls", "evidence",
        "hitl_reviews", "policies", "audit_logs", "agents", "vendors"
    ]
    
    results = {}
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
    }
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        for table in tables:
            try:
                resp = await client.get(
                    f"{supabase_url}/rest/v1/{table}?select=id&limit=1",
                    headers=headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results[table] = {"exists": True, "row_count_sample": len(data)}
                elif resp.status_code == 404:
                    results[table] = {"exists": False, "error": "table not found"}
                else:
                    results[table] = {"exists": None, "status": resp.status_code}
            except Exception:
                results[table] = {"exists": None, "error": "check_failed"}
    
    existing = sum(1 for v in results.values() if v.get("exists") is True)
    return {
        "configured": True,
        "supabase_url": supabase_url,
        "tables": results,
        "existing_count": existing,
        "total_checked": len(tables),
        "ready": existing == len(tables),
        "message": f"{existing}/{len(tables)} core tables found in Supabase"
    }
