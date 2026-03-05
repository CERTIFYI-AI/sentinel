"""pgvector-backed golden source for RAG fact-checking.

Stores document chunks with their sentence-transformer embeddings in
PostgreSQL with the pgvector extension. The verifier queries this store
to retrieve evidence documents for NLI-based claim verification.

All queries use parameterised SQL via asyncpg — no f-string query
construction anywhere in this module.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import asyncpg
    from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

# Module-level singleton for the embedding model — loaded once at startup
# by calling init_embedding_model(), not per-request
_embedding_model: SentenceTransformer | None = None


@dataclass(frozen=True)
class SearchResult:
    """A single document chunk returned from a golden source search."""

    doc_id: str
    chunk_index: int
    content: str
    similarity: float
    source_url: str


def init_embedding_model(model_name: str = "all-MiniLM-L6-v2") -> None:
    """Load the sentence-transformers model into module-level memory.

    Called once at application startup. The same model MUST be used for
    both ingestion and search — mismatched models produce meaningless
    cosine similarity scores.

    Args:
        model_name: HuggingFace model identifier. Default is all-MiniLM-L6-v2
            which produces 384-dimensional embeddings and runs on CPU in
            ~5ms per sentence.
    """
    global _embedding_model  # noqa: PLW0603
    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer(model_name)
        dim = _embedding_model.get_sentence_embedding_dimension()
        logger.info("Loaded embedding model: %s (dim=%d)", model_name, dim)
    except ImportError:
        logger.warning(
            "sentence-transformers not installed. Vector search will not work. "
            "Install with: pip install sentence-transformers"
        )


def _get_model() -> SentenceTransformer:
    """Return the loaded embedding model or raise a clear error."""
    if _embedding_model is None:
        msg = (
            "Embedding model not initialized. Call init_embedding_model() at startup. "
            "This usually means sentence-transformers is not installed."
        )
        raise RuntimeError(msg)
    return _embedding_model


def _embed(text: str) -> list[float]:
    """Embed a single text string using the module-level model."""
    model = _get_model()
    embedding = model.encode(text, normalize_embeddings=True)
    return embedding.tolist()


async def upsert(
    doc_id: str,
    tenant_id: str,
    chunks: list[dict[str, str]],
    db: asyncpg.Connection,
) -> int:
    """Insert or update document chunks with embeddings into the golden source.

    Chunks are provided as a list of dicts with 'content' and optional
    'source_url' keys. Each chunk is embedded using the module-level
    sentence-transformers model and stored with its vector.

    Uses ON CONFLICT DO UPDATE so re-ingesting the same document replaces
    stale chunks rather than duplicating them.

    Args:
        doc_id: Unique document identifier (e.g., filename or URL hash).
        tenant_id: Tenant owning this document.
        chunks: List of {"content": str, "source_url": str} dicts.
        db: asyncpg connection from the pool.

    Returns:
        Number of chunks upserted.
    """
    count = 0
    for idx, chunk in enumerate(chunks):
        content = chunk["content"]
        source_url = chunk.get("source_url", "")
        embedding = _embed(content)
        embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

        await db.execute(
            "INSERT INTO golden_source (doc_id, tenant_id, chunk_index, source_url, content, embedding) "
            "VALUES ($1, $2, $3, $4, $5, $6::vector) "
            "ON CONFLICT (doc_id, tenant_id, chunk_index) DO UPDATE SET "
            "content = EXCLUDED.content, embedding = EXCLUDED.embedding, "
            "source_url = EXCLUDED.source_url, created_at = NOW()",
            doc_id,
            tenant_id,
            idx,
            source_url,
            content,
            embedding_str,
        )
        count += 1

    logger.info(
        "Upserted %d chunks for doc %s (tenant=%s)",
        count,
        doc_id,
        tenant_id,
    )
    return count


async def search(
    query: str,
    tenant_id: str,
    db: asyncpg.Connection,
    top_k: int = 3,
    similarity_threshold: float = 0.72,
) -> list[SearchResult]:
    """Find the most similar document chunks to a query string.

    Embeds the query using the same model used for ingestion, then
    performs a cosine similarity search via pgvector's <=> operator.
    Only returns results above the similarity threshold to avoid
    low-quality matches that would pollute NLI scoring.

    Args:
        query: The claim or question to search for.
        tenant_id: Restrict search to this tenant's documents.
        db: asyncpg connection from the pool.
        top_k: Maximum number of results to return.
        similarity_threshold: Minimum cosine similarity (0.0–1.0).

    Returns:
        List of SearchResult ordered by descending similarity.
    """
    embedding = _embed(query)
    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

    rows = await db.fetch(
        "SELECT doc_id, chunk_index, content, source_url, "
        "1 - (embedding <=> $1::vector) AS similarity "
        "FROM golden_source "
        "WHERE tenant_id = $2 "
        "AND 1 - (embedding <=> $1::vector) >= $3 "
        "ORDER BY embedding <=> $1::vector ASC "
        "LIMIT $4",
        embedding_str,
        tenant_id,
        similarity_threshold,
        top_k,
    )

    results = [
        SearchResult(
            doc_id=row["doc_id"],
            chunk_index=int(row["chunk_index"]),
            content=row["content"],
            similarity=float(row["similarity"]),
            source_url=row["source_url"] or "",
        )
        for row in rows
    ]

    logger.debug(
        "Vector search for '%s...' returned %d results (tenant=%s)",
        query[:50],
        len(results),
        tenant_id,
    )
    return results


async def delete(
    doc_id: str,
    tenant_id: str,
    db: asyncpg.Connection,
) -> int:
    """Delete all chunks for a document from the golden source.

    Returns:
        Number of rows deleted.
    """
    result = await db.execute(
        "DELETE FROM golden_source WHERE doc_id = $1 AND tenant_id = $2",
        doc_id,
        tenant_id,
    )
    count = int(result.split(" ")[-1])
    logger.info("Deleted %d chunks for doc %s (tenant=%s)", count, doc_id, tenant_id)
    return count


async def count(tenant_id: str, db: asyncpg.Connection) -> int:
    """Count total document chunks in the golden source for a tenant."""
    row = await db.fetchrow(
        "SELECT COUNT(*) as cnt FROM golden_source WHERE tenant_id = $1",
        tenant_id,
    )
    return int(row["cnt"]) if row else 0


class VectorStore:
    """Wrapper class for vector store operations.

    Provides an OOP interface around the module-level async functions
    for use in dependency injection and testing.
    """

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model_name = model_name

    async def ingest(
        self,
        tenant_id: str,
        doc_id: str,
        content: str,
        db: "asyncpg.Connection",
        chunk_size: int = 512,
        source_url: str = "",
    ) -> int:
        """Ingest a document into the vector store."""
        return await ingest(
            tenant_id=tenant_id,
            doc_id=doc_id,
            content=content,
            db=db,
            chunk_size=chunk_size,
            source_url=source_url,
        )

    async def search(
        self,
        tenant_id: str,
        query: str,
        db: "asyncpg.Connection",
        top_k: int = 5,
    ) -> list[SearchResult]:
        """Search the vector store."""
        return await search(
            tenant_id=tenant_id,
            query=query,
            db=db,
            top_k=top_k,
        )

