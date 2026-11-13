#!/usr/bin/env python3
"""Run the self-hosted image or the migrations against Aiven from a laptop.

    python3 scripts/aiven.py migrate          # apply backend/db/migrations
    python3 scripts/aiven.py run [IMAGE]      # serve the image on :8300 (BACKEND_PORT overrides)
    python3 scripts/aiven.py url              # print the connection URL (for `gh secret set`)

Reads AIVEN_PG_PASSWORD and GEMINI_API_KEY from .env (quotes allowed) and the
host, database and user from backend/infra.config.json. Secrets are passed to
docker through the environment, never on a command line.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
MIGRATE_IMAGE = "migrate/migrate:v4.19.1"


def read_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        match = re.match(r"^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
        if match:
            value = match.group(2).strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
                value = value[1:-1]
            env[match.group(1)] = value
    return env


def require(env: dict[str, str], name: str) -> str:
    if not env.get(name):
        sys.exit(f"{name} is empty in .env")
    return env[name]


def database_url(env: dict[str, str]) -> str:
    server = json.loads((ROOT / "backend/infra.config.json").read_text(encoding="utf-8"))["sql_servers"][0]
    database = server["databases"]["silta"]
    password = quote(require(env, "AIVEN_PG_PASSWORD"), safe="")
    return f"postgres://{database['username']}:{password}@{server['host']}/{database['name']}?sslmode=require"


def main() -> int:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    env = read_env()
    if command == "url":
        sys.stdout.write(database_url(env))
        return 0
    if command == "migrate":
        return subprocess.call(
            ["docker", "run", "--rm", "-e", "DATABASE_URL",
             "-v", f"{ROOT / 'backend/db/migrations'}:/migrations:ro", "--entrypoint", "sh", MIGRATE_IMAGE,
             "-c", 'migrate -path /migrations -database "$DATABASE_URL" up'],
            env={**os.environ, "DATABASE_URL": database_url(env)},
        )
    if command == "run":
        image = sys.argv[2] if len(sys.argv) > 2 else "silta-api:dev"
        port = os.environ.get("BACKEND_PORT") or env.get("BACKEND_PORT", "8300")
        secrets = {name: require(env, name) for name in ("AIVEN_PG_PASSWORD", "GEMINI_API_KEY")}
        args = ["docker", "run", "--rm", "-p", f"127.0.0.1:{port}:8080"]
        for name in secrets:
            args += ["-e", name]
        return subprocess.call([*args, image], env={**os.environ, **secrets})
    sys.exit(__doc__)


if __name__ == "__main__":
    sys.exit(main())
