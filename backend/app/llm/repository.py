"""SQL for llm_usage. Only app.llm writes this table."""

import psycopg
from psycopg.types.json import Jsonb

from app.llm.schemas import UsageRecord


def insert_usage(conn: psycopg.Connection, record: UsageRecord) -> None:
    conn.execute(
        """
        INSERT INTO llm_usage (
            feature, provider, model, status, prompt_tokens, completion_tokens,
            total_tokens, cost_usd, latency_ms, error, context
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            record.feature,
            record.provider,
            record.model,
            record.status,
            record.prompt_tokens,
            record.completion_tokens,
            record.total_tokens,
            record.cost_usd,
            record.latency_ms,
            record.error,
            Jsonb(record.context),
        ),
    )


def summarize_by_feature(conn: psycopg.Connection) -> list[dict]:
    return conn.execute(
        """
        SELECT feature, provider, model, count(*) AS calls,
               sum(total_tokens) AS total_tokens, sum(cost_usd) AS cost_usd
        FROM llm_usage
        GROUP BY feature, provider, model
        ORDER BY cost_usd DESC NULLS LAST
        """
    ).fetchall()
