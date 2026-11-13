import psycopg


def ping_database(conn: psycopg.Connection) -> bool:
    row = conn.execute("SELECT 1 AS ok").fetchone()
    return bool(row and row["ok"] == 1)
