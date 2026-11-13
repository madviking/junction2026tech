# core

Shared infrastructure used by every module. Keep it small.

- `db.py`: `connect()` context manager and the `get_conn` FastAPI dependency
  (psycopg 3, dict rows, commit on success). Only repositories run SQL.

Configuration lives in `app/config.py` (`get_settings()`).
