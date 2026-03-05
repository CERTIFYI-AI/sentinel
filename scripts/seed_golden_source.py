#!/usr/bin/env python3
"""CLI tool to ingest documents into the Sentinel golden source vector database.

Usage:
    python scripts/seed_golden_source.py --input ./docs/ --format pdf,md,txt
    python scripts/seed_golden_source.py --url https://example.com/api-docs
    python scripts/seed_golden_source.py --jsonl ./facts.jsonl

Chunks documents intelligently (max 512 tokens, 50-token overlap, no mid-sentence
splits), generates embeddings with sentence-transformers/all-MiniLM-L6-v2 (the
same model used by the verifier for consistency), and upserts into pgvector.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
from pathlib import Path
from typing import Iterator

import asyncpg
import numpy as np
import typer
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from sentence_transformers import SentenceTransformer

from sentinel.config import load_config

console = Console()
app = typer.Typer(help="Seed the Sentinel golden source with ground-truth documents.")

# ---------------------------------------------------------------------------
# Embedding model — must match sentinel/layers/verifier.py exactly.
# Mismatched models produce incompatible embeddings that break cosine similarity.
# ---------------------------------------------------------------------------
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
MAX_CHUNK_TOKENS = 512
OVERLAP_TOKENS = 50


def _approximate_token_count(text: str) -> int:
    """Rough token count: split on whitespace.  Good enough for chunking."""
    return len(text.split())


def _chunk_text(text: str) -> list[str]:
    """Split text into chunks of max MAX_CHUNK_TOKENS tokens with OVERLAP_TOKENS overlap.

    Splits on double-newlines first (paragraph boundaries), then falls back to
    sentence boundaries.  Never splits mid-sentence.
    """
    paragraphs = re.split(r"\n\n+", text.strip())
    chunks: list[str] = []
    current_chunk: list[str] = []
    current_tokens = 0

    for para in paragraphs:
        para_tokens = _approximate_token_count(para)
        if current_tokens + para_tokens > MAX_CHUNK_TOKENS and current_chunk:
            chunks.append("\n\n".join(current_chunk))
            # Overlap: keep the last paragraph if it fits.
            if para_tokens <= OVERLAP_TOKENS:
                current_chunk = [current_chunk[-1], para] if current_chunk else [para]
                current_tokens = _approximate_token_count(" ".join(current_chunk))
            else:
                current_chunk = [para]
                current_tokens = para_tokens
        else:
            current_chunk.append(para)
            current_tokens += para_tokens

    if current_chunk:
        chunks.append("\n\n".join(current_chunk))

    return chunks if chunks else [text]


def _load_files(input_dir: Path, formats: list[str]) -> Iterator[tuple[str, str]]:
    """Yield (filename, content) tuples from a directory tree."""
    for fmt in formats:
        for filepath in input_dir.rglob(f"*.{fmt}"):
            if fmt == "pdf":
                try:
                    from pypdf import PdfReader
                    reader = PdfReader(filepath)
                    content = "\n".join(page.extract_text() or "" for page in reader.pages)
                except ImportError:
                    console.print("[red]pypdf not installed. Run: pip install pypdf[/red]")
                    continue
            else:
                content = filepath.read_text(encoding="utf-8", errors="replace")
            yield str(filepath), content


def _load_jsonl(jsonl_path: Path) -> Iterator[tuple[str, str]]:
    """Yield (doc_id, content) from a JSONL file with {"text": "..."}."""
    with jsonl_path.open() as f:
        for i, line in enumerate(f):
            obj = json.loads(line)
            text = obj.get("text", "")
            doc_id = obj.get("id", f"jsonl-{i}")
            if text:
                yield doc_id, text


async def _upsert_chunks(
    pool: asyncpg.Pool,
    model: SentenceTransformer,
    doc_id: str,
    content: str,
    source_url: str,
    tenant_id: str = "default",
) -> int:
    """Chunk, embed, and upsert a single document. Returns chunk count."""
    chunks = _chunk_text(content)
    embeddings = model.encode(chunks, show_progress_bar=False)

    async with pool.acquire() as conn:
        for idx, (chunk, emb) in enumerate(zip(chunks, embeddings)):
            emb_list = emb.tolist()
            await conn.execute(
                """
                INSERT INTO embeddings (document_id, chunk_index, source_url, content, embedding, tenant_id)
                VALUES ($1, $2, $3, $4, $5::vector, $6)
                ON CONFLICT (document_id, chunk_index)
                DO UPDATE SET content = EXCLUDED.content, embedding = EXCLUDED.embedding
                """,
                doc_id, idx, source_url, chunk, str(emb_list), tenant_id,
            )
    return len(chunks)


@app.command()
def seed(
    input_dir: Path = typer.Option(None, "--input", help="Directory of documents to ingest."),
    formats: str = typer.Option("pdf,md,txt", "--format", help="Comma-separated file formats."),
    url: str = typer.Option(None, "--url", help="URL to fetch and ingest."),
    jsonl: Path = typer.Option(None, "--jsonl", help="JSONL file with {text: ...} entries."),
    db_url: str = typer.Option(
        "postgresql://sentinel:sentinel@localhost:5432/sentinel",
        "--db-url", help="PostgreSQL connection string."
    ),
    tenant_id: str = typer.Option("default", "--tenant-id", help="Tenant to associate docs with."),
) -> None:
    """Ingest documents into the Sentinel golden source vector database."""
    start = time.time()
    console.print("[bold green]Loading embedding model...[/bold green]")
    model = SentenceTransformer(EMBEDDING_MODEL_NAME)

    async def _run() -> None:
        pool = await asyncpg.create_pool(dsn=db_url, min_size=2, max_size=10)

        total_docs = 0
        total_chunks = 0

        with Progress(SpinnerColumn(), TextColumn("[progress.description]{task.description}")) as progress:
            task = progress.add_task("Ingesting documents...", total=None)

            if input_dir:
                fmt_list = [f.strip() for f in formats.split(",")]
                for doc_path, content in _load_files(input_dir, fmt_list):
                    doc_id = hashlib.sha256(doc_path.encode()).hexdigest()[:16]
                    n = await _upsert_chunks(pool, model, doc_id, content, doc_path, tenant_id)
                    total_docs += 1
                    total_chunks += n
                    progress.update(task, description=f"Ingested {total_docs} docs, {total_chunks} chunks")

            if jsonl:
                for doc_id, content in _load_jsonl(jsonl):
                    n = await _upsert_chunks(pool, model, doc_id, content, str(jsonl), tenant_id)
                    total_docs += 1
                    total_chunks += n
                    progress.update(task, description=f"Ingested {total_docs} docs, {total_chunks} chunks")

            if url:
                import httpx
                resp = httpx.get(url, follow_redirects=True, timeout=30)
                doc_id = hashlib.sha256(url.encode()).hexdigest()[:16]
                n = await _upsert_chunks(pool, model, doc_id, resp.text, url, tenant_id)
                total_docs += 1
                total_chunks += n

        await pool.close()
        elapsed = time.time() - start
        console.print(
            f"\n[bold green]Done![/bold green] "
            f"{total_docs} documents -> {total_chunks} chunks -> "
            f"embedded and stored in {elapsed:.1f}s"
        )

    asyncio.run(_run())


if __name__ == "__main__":
    app()
