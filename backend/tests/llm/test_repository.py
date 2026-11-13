import psycopg

from app.llm import repository
from app.llm.schemas import UsageRecord


def test_usage_row_round_trips(db_conn: psycopg.Connection) -> None:
    record = UsageRecord(
        feature="test.repository",
        provider="openrouter",
        model="test/model",
        status="ok",
        latency_ms=12,
        prompt_tokens=3,
        completion_tokens=4,
        total_tokens=7,
        cost_usd=0.000123,
        context={"marker": "pytest"},
    )

    repository.insert_usage(db_conn, record)

    rows = [row for row in repository.summarize_by_feature(db_conn) if row["feature"] == "test.repository"]
    assert len(rows) == 1
    assert rows[0]["calls"] == 1
    assert rows[0]["total_tokens"] == 7
