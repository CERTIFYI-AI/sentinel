#!/usr/bin/env python3
"""Create the first admin tenant and API key."""
import argparse, asyncio, hashlib, secrets, os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncpg

async def main():
    parser = argparse.ArgumentParser(description="Create first admin")
    parser.add_argument("--email", required=True)
    parser.add_argument("--org-name", required=True)
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL", "postgresql://sentinel:sentinel@localhost:5432/sentinel")
    pool = await asyncpg.create_pool(db_url)
    assert pool is not None

    tenant_id = f"tenant-{secrets.token_hex(8)}"
    raw_key = f"sk-sentinel-{secrets.token_hex(20)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO tenants (tenant_id, name, plan, config) VALUES ($1, $2, $3, $4)",
            tenant_id, args.org_name, "enterprise",
            f'{{"admin_email": "{args.email}"}}',
        )
        await conn.execute(
            "INSERT INTO api_keys (id, tenant_id, key_hash, prefix, name, scopes) VALUES ($1, $2, $3, $4, $5, $6)",
            secrets.token_hex(16), tenant_id, key_hash, raw_key[:16], "admin",
            ["proxy", "dashboard", "admin"],
        )

    await pool.close()
    print(f"Admin created for {args.org_name}")
    print(f"Tenant ID: {tenant_id}")
    print(f"API Key:   {raw_key[:8]}...{raw_key[-4:]}")
    print(f"Full key written to: ./admin-key-{tenant_id[:12]}.secret")
    key_path = f"./admin-key-{tenant_id[:12]}.secret"
    with open(key_path, "w") as f:
        f.write(raw_key + "\n")
    os.chmod(key_path, 0o600)
    print("Store this key securely and delete the file after retrieving it.")

if __name__ == "__main__":
    asyncio.run(main())
