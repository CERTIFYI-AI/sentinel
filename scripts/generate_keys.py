#!/usr/bin/env python3
"""Generate Ed25519 signing keys for the Sentinel audit ledger.

Produces a PEM-encoded private key and corresponding public key used to
digitally sign audit entries, providing non-repudiation on top of the
hash-chain integrity.

Usage:
    python scripts/generate_keys.py
    python scripts/generate_keys.py --output-dir ./keys --key-name sentinel-audit
"""
from __future__ import annotations

from pathlib import Path

import typer
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from rich.console import Console

console = Console()
app = typer.Typer(help="Generate Ed25519 signing keys for audit ledger integrity.")


@app.command()
def generate(
    output_dir: Path = typer.Option(
        "./keys",
        "--output-dir",
        help="Directory to write key files. Created if it doesn't exist.",
    ),
    key_name: str = typer.Option(
        "sentinel-audit",
        "--key-name",
        help="Base name for key files (produces {name}.pem and {name}.pub).",
    ),
) -> None:
    """Generate an Ed25519 keypair and write to disk."""
    output_dir.mkdir(parents=True, exist_ok=True)

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    private_path = output_dir / f"{key_name}.pem"
    public_path = output_dir / f"{key_name}.pub"

    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    private_path.write_bytes(private_bytes)
    public_path.write_bytes(public_bytes)

    # Restrict permissions on private key (owner read-only).
    private_path.chmod(0o400)

    console.print(f"[bold green]Private key:[/bold green] {private_path}")
    console.print(f"[bold green]Public key:[/bold green]  {public_path}")
    console.print(
        "\n[dim]Add the private key path to SENTINEL_AUDIT_SIGNING_KEY in .env.[/dim]\n"
        "[dim]Never commit the private key to version control.[/dim]"
    )


if __name__ == "__main__":
    app()
