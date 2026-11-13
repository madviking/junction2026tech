Status: active
Last reviewed: 2026-11-13

# 0001 — Backend runtime: thin FastAPI now, Encore possible

## Context

We do not know the product yet. We might build on Encore (Go), which East already
runs for `encore.east.fi` and `technologies.quea.st`, or stay in Python if the idea
leans on Python ML/LLM libraries.

## Decision

Start with a deliberately thin FastAPI backend and keep every boundary
language-neutral so a switch costs hours, not a day:

- SQL migrations in Encore's file format (`db/migrations/<n>_<name>.up.sql`).
- The API contract as an OpenAPI file in `contracts/`; the frontend depends only on it.
- LLM access behind one module with a small surface (`complete(feature, messages, output_type)`).
- Plain HTTP + JSON under `/api`; health at `/api/health`.

Do not add Python-only infrastructure (ORM models, Alembic, Celery, PydanticAI
agents) until this decision is revisited.

## Consequences

- Repositories use plain SQL through `psycopg`, which ports directly to Encore `sqldb`.
- The LLM module is about 300 lines; an Encore version would reimplement it in Go
  against the same seeds and `llm_usage` table.

## Revisit when

The product idea is chosen. If we pick Encore: create an Encore app in `backend/`,
point its `sqldb` at `db/migrations`, generate the TypeScript client or OpenAPI
from Encore, and delete the Python package.
