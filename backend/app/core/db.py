"""PostgreSQL access. Repositories take a connection; nothing else issues SQL."""

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.config import get_settings


@contextmanager
def connect(database_url: str | None = None) -> Iterator[psycopg.Connection]:
    """Open a short-lived connection that commits on success and rolls back on error."""
    url = database_url or get_settings().database_url
    with psycopg.connect(url, row_factory=dict_row, connect_timeout=5) as conn:
        yield conn


def get_conn() -> Iterator[psycopg.Connection]:
    """FastAPI dependency for routes that need a connection (pass it to a service)."""
    with connect() as conn:
        yield conn
