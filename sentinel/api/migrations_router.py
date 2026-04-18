"""
Migration runner endpoint.
POST /api/migrate with {service_role_key: string} to apply the core GRC tables
to the configured Supabase project.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, httpx, pathlib

router = APIRouter()

class MigrateRequest(BaseModel):
    service_role_key: str
    dry_run: bool = False

@router.post("")
async def run_migration(body: MigrateRequest):
    supabase_url = os.environ.get("VITE_SUPABASE_URL", "")
    if not supabase_url:
        raise HTTPException(400, "VITE_SUPABASE_URL not configured")
    
    sql_file = pathlib.Path("supabase/migrations/20260418_core_grc_tables.sql")
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
                    err = resp.text[:200]
                    if err not in errors:
                        errors.append(f"Statement failed ({resp.status_code}): {err}")
            except HTTPException:
                raise
            except Exception as e:
                failed += 1
                errors.append(str(e)[:200])
    
    return {
        "success": True,
        "succeeded": succeeded,
        "failed": failed,
        "total": len(statements),
        "errors": errors[:10],
        "message": f"Migration complete: {succeeded} succeeded, {failed} failed"
    }

@router.get("/status")
async def migration_status():
    """Check which tables exist in Supabase via anon key (SELECT only)."""
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
                    results[table] = {"exists": None, "status": resp.status_code, "error": resp.text[:100]}
            except Exception as e:
                results[table] = {"exists": None, "error": str(e)[:100]}
    
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
