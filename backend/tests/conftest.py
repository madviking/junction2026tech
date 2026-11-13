from collections.abc import Iterator

import psycopg
import pytest
from psycopg.rows import dict_row

from app.config import get_settings


@pytest.fixture
def db_conn() -> Iterator[psycopg.Connection]:
    """Real local PostgreSQL connection inside a transaction that is rolled back."""
    try:
        conn = psycopg.connect(get_settings().database_url, connect_timeout=2, row_factory=dict_row)
    except psycopg.OperationalError:
        pytest.skip("PostgreSQL is not running; start it with `make up`")
    try:
        with conn.transaction(force_rollback=True):
            yield conn
    finally:
        conn.close()
