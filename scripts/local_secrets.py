#!/usr/bin/env python3
"""Write backend/.secrets.local.cue (gitignored) from .env without printing values.

Encore local secrets for an app that is not linked to the Encore Platform.
Run: python3 scripts/local_secrets.py   (make setup runs it)
"""
from __future__ import annotations

import json
import re
import secrets
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPPING = {
    "GeminiApiKey": "GEMINI_API_KEY",
    "OpenRouterApiKey": "OPEN_ROUTER_API_KEY",
    "ElevenLabsApiKey": "ELEVEN_LABS_API_KEY",
    "VisitCodePepper": "VISIT_CODE_PEPPER",
}
# Generated locally when .env does not set them; kept stable across runs.
GENERATED = {"VisitCodePepper"}


def main() -> int:
    env: dict[str, str] = {}
    env_file = ROOT / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
            if m and m.group(2).strip().strip("'\""):
                env[m.group(1)] = m.group(2).strip().strip("'\"")
    out = ROOT / "backend" / ".secrets.local.cue"
    existing: dict[str, str] = {}
    if out.exists():
        for line in out.read_text(encoding="utf-8").splitlines():
            m = re.match(r'^(\w+): (".*")$', line.strip())
            if m:
                existing[m.group(1)] = json.loads(m.group(2))
    for secret in GENERATED:
        var = MAPPING[secret]
        if not env.get(var):
            env[var] = existing.get(secret) or secrets.token_urlsafe(32)
    lines = ["// Local Encore secrets, generated from .env by scripts/local_secrets.py. Gitignored."]
    for secret, var in MAPPING.items():
        # Empty values keep the app starting; provider adapters then fail or use their fakes.
        lines.append(f"{secret}: {json.dumps(env.get(var, ''))}")
        print(f"{secret}: {'set' if env.get(var) else 'empty'}")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    out.chmod(0o600)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
