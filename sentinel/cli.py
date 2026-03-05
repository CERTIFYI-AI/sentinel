"""CLI interface for Certifyi Sentinel.

Provides command-line tools for starting the proxy server,
running health checks, and querying audit logs.
"""

from __future__ import annotations

import sys
from typing import Optional

import click
import uvicorn


@click.group()
@click.version_option(package_name="certifyi-sentinel")
def cli() -> None:
    """Certifyi Sentinel - AI reliability and governance middleware."""


@cli.command()
@click.option("--host", default="0.0.0.0", help="Bind host")
@click.option("--port", default=8080, type=int, help="Bind port")
@click.option("--workers", default=1, type=int, help="Number of workers")
@click.option("--config", "config_path", default=None, help="Config file path")
@click.option("--reload", is_flag=True, help="Enable auto-reload")
def serve(
    host: str,
    port: int,
    workers: int,
    config_path: Optional[str],
    reload: bool,
) -> None:
    """Start the Sentinel proxy server."""
    import os

    if config_path:
        os.environ["SENTINEL_CONFIG_PATH"] = config_path

    click.echo(f"Starting Certifyi Sentinel on {host}:{port}")
    uvicorn.run(
        "sentinel.proxy:create_app",
        host=host,
        port=port,
        workers=workers,
        reload=reload,
        factory=True,
    )


@cli.command()
@click.option("--config", "config_path", default=None, help="Config file path")
def check(config_path: Optional[str]) -> None:
    """Validate configuration."""
    from sentinel.config import load_config

    try:
        cfg = load_config(config_path)
        click.echo("Configuration is valid.")
        click.echo(f"  Environment: {cfg.environment}")
        click.echo(f"  Providers: {len(cfg.providers)}")
        click.echo(f"  Proxy: {cfg.proxy.host}:{cfg.proxy.port}")
        click.echo(f"  Audit backend: {cfg.audit.storage_backend}")
        click.echo(f"  Fact-check: {'enabled' if cfg.fact_check.enabled else 'disabled'}")
    except Exception as exc:
        click.echo(f"Configuration error: {exc}", err=True)
        sys.exit(1)


@cli.command()
@click.option("--request-id", default=None, help="Filter by request ID")
@click.option("--event-type", default=None, help="Filter by event type")
@click.option("--limit", default=20, type=int, help="Max results")
@click.option("--config", "config_path", default=None, help="Config file path")
def logs(
    request_id: Optional[str],
    event_type: Optional[str],
    limit: int,
    config_path: Optional[str],
) -> None:
    """Query audit logs."""
    import asyncio
    import json

    from sentinel.audit import AuditLogger
    from sentinel.config import load_config

    cfg = load_config(config_path)
    logger = AuditLogger(cfg.audit)

    async def _query() -> None:
        events = await logger.query(
            request_id=request_id,
            event_type=event_type,
            limit=limit,
        )
        for event in events:
            click.echo(json.dumps(event, indent=2, default=str))
        await logger.close()

    asyncio.run(_query())


@cli.command()
def init() -> None:
    """Initialize a new Sentinel configuration file."""
    import yaml

    default_config = {
        "app_name": "certifyi-sentinel",
        "environment": "development",
        "debug": False,
        "log_level": "INFO",
        "proxy": {"host": "0.0.0.0", "port": 8080, "workers": 4},
        "providers": [
            {
                "name": "openai",
                "api_base": "https://api.openai.com/v1",
                "api_key": "${OPENAI_API_KEY}",
                "model": "gpt-4",
                "enabled": True,
            }
        ],
        "policy": {
            "default_action": "allow",
            "pii_detection": True,
            "blocked_topics": [],
        },
        "fact_check": {"enabled": True, "provider": "internal"},
        "audit": {
            "enabled": True,
            "storage_backend": "sqlite",
            "storage_path": "data/audit.db",
        },
    }

    with open("sentinel.yaml", "w") as fh:
        yaml.dump(default_config, fh, default_flow_style=False, sort_keys=False)

    click.echo("Created sentinel.yaml")


def main() -> None:
    """Entry point."""
    cli()


if __name__ == "__main__":
    main()
