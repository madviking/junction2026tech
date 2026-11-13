"""Write the FastAPI OpenAPI contract. Usage: uv run python scripts/export_openapi.py <output path>"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: export_openapi.py <output path>")
    output = Path(sys.argv[1])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
