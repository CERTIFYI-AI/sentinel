# SPDX-License-Identifier: Apache-2.0
# Copyright (c) 2026 CERTIFYI-AI.
"""Policy ingestion: chunk, embed, store.

The retrieval half of the AI Brain. Policy documents are long and an LLM's
context window is not; embedding a whole document also blurs the one clause
that answers the question into the average of everything around it. So text is
split into passages, each embedded separately, and retrieval returns passages.

Connection: ``SENTINEL_DATABASE_URL`` (service role — RLS does not apply,
which is why every statement here carries ``org_id`` explicitly).

Environment:
    SENTINEL_DATABASE_URL        asyncpg DSN, required
    SENTINEL_EMBEDDING_MODEL     default ``text-embedding-3-small`` (1536-dim)
    OPENAI_API_KEY               or whatever key the chosen model needs;
                                 litellm routes by model name.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
from dataclasses import dataclass, field

import asyncpg

logger = logging.getLogger("sentinel.services.embedding")

# The column is vector(1536). Changing the model without changing the column —
# or vice versa — produces a dimension error at insert, which is the good case;
# the bad case is two models' vectors in one table, where distances are
# meaningless but nothing errors. `embedding_model` is stored per row so that
# mismatch is detectable after the fact.
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

# ~500 tokens. We deliberately do NOT pull in a tokenizer: tiktoken is a heavy
# dependency for an approximation, and the ratio is stable enough for chunking
# (~4 characters per token for English prose). Slightly-off chunk sizes cost
# recall at the margin; a wrong dependency costs every deployment.
CHARS_PER_TOKEN = 4
DEFAULT_CHUNK_TOKENS = 500
DEFAULT_OVERLAP_TOKENS = 50

# Separators in descending order of "how much meaning survives splitting here".
# Paragraph breaks first, sentences next, words last — a hard character split
# is the fallback of last resort because it cuts mid-word.
_SEPARATORS: tuple[str, ...] = ("\n\n", "\n", ". ", "? ", "! ", "; ", ", ", " ")

# Embedding APIs rate-limit. Six concurrent requests is well inside every
# provider's default and keeps a 200-chunk policy under a minute.
_MAX_CONCURRENT_EMBEDDINGS = 6


@dataclass(frozen=True)
class PolicyChunk:
    """One retrievable passage of a policy document."""

    index: int
    content: str
    token_estimate: int
    content_hash: str = field(default="")

    def __post_init__(self) -> None:
        if not self.content_hash:
            object.__setattr__(
                self, "content_hash", hashlib.sha256(self.content.encode()).hexdigest()
            )


def estimate_tokens(text: str) -> int:
    """Approximate token count. See CHARS_PER_TOKEN for why this is not exact."""
    return max(1, len(text) // CHARS_PER_TOKEN)


def split_text(
    text: str,
    chunk_tokens: int = DEFAULT_CHUNK_TOKENS,
    overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
) -> list[PolicyChunk]:
    """Recursive character splitter.

    Tries each separator in turn and only descends to a finer one when a piece
    is still too big. Chunks overlap by ``overlap_tokens`` so a requirement
    that straddles a boundary — "...access must be reviewed / quarterly by the
    control owner." — is fully present in at least one chunk. Without overlap,
    the single most retrievable sentence in a policy is the one most likely to
    be cut in half.

    Returns an empty list for empty input rather than one empty chunk: an
    embedding of "" is a real vector that matches nothing meaningfully and
    would sit in the index forever.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    max_chars = max(1, chunk_tokens * CHARS_PER_TOKEN)
    overlap_chars = max(0, min(overlap_tokens, chunk_tokens - 1) * CHARS_PER_TOKEN)

    pieces = _split_recursive(cleaned, max_chars, list(_SEPARATORS))

    # Re-join adjacent pieces up to the budget, then apply overlap. Splitting
    # produces many small fragments; packing them back keeps chunks near the
    # target size instead of one-sentence-per-chunk.
    chunks: list[str] = []
    buf = ""
    for piece in pieces:
        candidate = f"{buf}{piece}" if buf else piece
        if len(candidate) <= max_chars:
            buf = candidate
            continue
        if buf:
            chunks.append(buf.strip())
        buf = (chunks[-1][-overlap_chars:] + piece) if (chunks and overlap_chars) else piece
    if buf.strip():
        chunks.append(buf.strip())

    return [
        PolicyChunk(index=i, content=c, token_estimate=estimate_tokens(c))
        for i, c in enumerate(chunks)
        if c
    ]


def _split_recursive(text: str, max_chars: int, separators: list[str]) -> list[str]:
    """Split on the coarsest separator that gets pieces under the budget."""
    if len(text) <= max_chars:
        return [text]
    if not separators:
        # No separator left: cut on the character budget. Cuts mid-word, which
        # is why it is last.
        return [text[i : i + max_chars] for i in range(0, len(text), max_chars)]

    sep, rest = separators[0], separators[1:]
    parts = text.split(sep)
    if len(parts) == 1:
        return _split_recursive(text, max_chars, rest)

    out: list[str] = []
    for i, part in enumerate(parts):
        # Put the separator back — losing "\n\n" changes the meaning of a
        # policy's structure, and losing ". " runs sentences together.
        piece = part + (sep if i < len(parts) - 1 else "")
        out.extend(_split_recursive(piece, max_chars, rest) if len(piece) > max_chars else [piece])
    return [p for p in out if p]


def to_pgvector(values: list[float]) -> str:
    """Render a vector as the literal pgvector parses.

    asyncpg has no native codec for the ``vector`` type, and registering one
    means adding the ``pgvector`` package. The literal form plus an explicit
    ``::vector`` cast in the SQL is equivalent and dependency-free. Values are
    floats we produced, never user input, so there is nothing to escape — but
    the length is checked, because a wrong-width vector fails at insert with a
    message that does not name the model that produced it.
    """
    if len(values) != EMBEDDING_DIMENSIONS:
        raise ValueError(
            f"expected {EMBEDDING_DIMENSIONS}-dimensional embedding, got {len(values)} — "
            "the model and the vector(1536) column disagree"
        )
    return "[" + ",".join(repr(float(v)) for v in values) + "]"


class EmbeddingService:
    """Chunk policy text, embed each chunk, and store it org-scoped.

    Usage::

        svc = EmbeddingService()
        await svc.connect()
        try:
            n = await svc.ingest_policy(org_id, policy_id, policy_text)
        finally:
            await svc.aclose()
    """

    def __init__(
        self,
        dsn: str | None = None,
        model: str | None = None,
        chunk_tokens: int = DEFAULT_CHUNK_TOKENS,
        overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
    ) -> None:
        self._dsn = dsn or os.environ.get("SENTINEL_DATABASE_URL")
        self.model = model or os.environ.get("SENTINEL_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
        self.chunk_tokens = chunk_tokens
        self.overlap_tokens = overlap_tokens
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        if self._pool is not None:
            return
        if not self._dsn:
            raise RuntimeError("SENTINEL_DATABASE_URL is not set — embedding service cannot start")
        self._pool = await asyncpg.create_pool(self._dsn, min_size=1, max_size=4)

    async def aclose(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def embed_one(self, text: str) -> list[float]:
        """Embed a single string. Raises on failure — never returns a zero vector.

        A zero vector would be silently stored and would sit at a constant
        distance from every query, so the chunk becomes permanently
        unretrievable while looking present. Failing loudly is the only honest
        option.
        """
        # Imported lazily so this module loads (and unit-tests) without litellm
        # or a network, matching how the integration adapters treat boto3.
        import litellm

        try:
            response = await litellm.aembedding(model=self.model, input=text)
        except Exception as exc:  # noqa: BLE001 — re-raised with context below
            raise RuntimeError(f"embedding request failed for model {self.model}: {exc}") from exc

        try:
            vector = response.data[0]["embedding"]
        except (AttributeError, KeyError, IndexError, TypeError) as exc:
            raise RuntimeError(f"unexpected embedding response shape from {self.model}") from exc

        if len(vector) != EMBEDDING_DIMENSIONS:
            raise RuntimeError(
                f"{self.model} returned {len(vector)} dimensions; "
                f"policy_knowledge_base.embedding is vector({EMBEDDING_DIMENSIONS})"
            )
        return list(vector)

    async def embed_many(self, texts: list[str]) -> list[list[float]]:
        """Embed concurrently, bounded. Order is preserved."""
        sem = asyncio.Semaphore(_MAX_CONCURRENT_EMBEDDINGS)

        async def one(t: str) -> list[float]:
            async with sem:
                return await self.embed_one(t)

        return list(await asyncio.gather(*(one(t) for t in texts)))

    async def ingest_policy(
        self,
        org_id: str,
        policy_id: str | None,
        text: str,
        *,
        replace: bool = True,
    ) -> int:
        """Chunk, embed and store one policy. Returns the number of chunks stored.

        ``replace=True`` deletes this policy's existing chunks first, inside the
        same transaction as the insert. A policy that shrank on re-ingest would
        otherwise leave orphan chunks from the old version in the index — and
        retrieval would keep quoting text the policy no longer contains, which
        is the worst possible failure for a compliance judgement.
        """
        if self._pool is None:
            raise RuntimeError("connect() must be awaited before ingest_policy()")

        chunks = split_text(text, self.chunk_tokens, self.overlap_tokens)
        if not chunks:
            logger.info("policy %s has no content to embed", policy_id)
            if replace:
                async with self._pool.acquire() as conn:
                    await self._delete_existing(conn, org_id, policy_id)
            return 0

        vectors = await self.embed_many([c.content for c in chunks])

        async with self._pool.acquire() as conn:
            async with conn.transaction():
                if replace:
                    await self._delete_existing(conn, org_id, policy_id)
                await conn.executemany(
                    """
                    INSERT INTO public.policy_knowledge_base
                      (org_id, policy_id, chunk_index, content, embedding,
                       embedding_model, content_hash, token_estimate)
                    VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8)
                    """,
                    [
                        (
                            org_id,
                            policy_id,
                            chunk.index,
                            chunk.content,
                            to_pgvector(vec),
                            self.model,
                            chunk.content_hash,
                            chunk.token_estimate,
                        )
                        for chunk, vec in zip(chunks, vectors, strict=True)
                    ],
                )

        logger.info(
            "embedded policy %s for org %s: %d chunks (%s)",
            policy_id, org_id, len(chunks), self.model,
        )
        return len(chunks)

    @staticmethod
    async def _delete_existing(
        conn: asyncpg.Connection, org_id: str, policy_id: str | None
    ) -> None:
        """Remove a policy's chunks. Always org-scoped — service role has no RLS."""
        if policy_id is None:
            return
        await conn.execute(
            "DELETE FROM public.policy_knowledge_base WHERE org_id = $1 AND policy_id = $2",
            org_id, policy_id,
        )


# Kept out of the class: it is a pure text operation and is exercised directly
# by the tests, which need no database and no network.
__all__ = [
    "EmbeddingService",
    "PolicyChunk",
    "split_text",
    "estimate_tokens",
    "to_pgvector",
    "DEFAULT_EMBEDDING_MODEL",
    "EMBEDDING_DIMENSIONS",
]
