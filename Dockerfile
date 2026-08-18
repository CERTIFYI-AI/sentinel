FROM python:3.11-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml ./
COPY sentinel/ sentinel/

# Install the base app plus the [integrations] extra: the evidence-sync worker
# (`python -m sentinel.integrations.worker`) runs the provider adapters, which
# need boto3 (AWS) and PyGithub (GitHub). The API process does not import them
# (adapters import their SDK lazily), but a single shared image keeps the two
# Fly processes — web and worker — byte-identical, so what CI builds is exactly
# what collects evidence.
RUN pip install --no-cache-dir '.[integrations]'

FROM python:3.11-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN groupadd --gid 1001 sentinel && \
    useradd --uid 1001 --gid sentinel --shell /bin/bash --create-home sentinel

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

RUN chown -R sentinel:sentinel /app

USER sentinel

EXPOSE 8000

CMD ["uvicorn", "sentinel.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
