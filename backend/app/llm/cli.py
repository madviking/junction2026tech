"""LLM smoke and usage CLI.

uv run python -m app.llm.cli smoke            # one paid call to example.summary (< 0.01 €)
uv run python -m app.llm.cli usage            # cost and tokens per feature/model
uv run python -m app.llm.cli integrations     # list integration keys and resolved models
"""

import argparse
import json

from pydantic import BaseModel, Field

from app.core.db import connect
from app.llm import registry, repository
from app.llm.client import LLMClient
from app.prompts import render_prompt

SMOKE_TEXT = (
    "Junction is a hackathon held in Helsinki. Teams of up to five build a prototype over a weekend "
    "and present it to judges on Sunday."
)


class SummaryOutput(BaseModel):
    headline: str
    points: list[str] = Field(max_length=3)


def _smoke() -> None:
    result = LLMClient().complete(
        feature="example.summary",
        messages=[
            {"role": "system", "content": render_prompt("example_summary_system", max_points=3)},
            {"role": "user", "content": SMOKE_TEXT},
        ],
        output_type=SummaryOutput,
        context={"source": "cli.smoke"},
    )
    print(
        json.dumps(
            {
                "provider": result.provider,
                "model": result.model,
                "parsed": result.parsed.model_dump() if result.parsed else None,
                "total_tokens": result.usage.total_tokens,
                "cost_usd": result.usage.cost_usd,
                "latency_ms": result.usage.latency_ms,
            },
            indent=2,
        )
    )


def _usage() -> None:
    with connect() as conn:
        rows = repository.summarize_by_feature(conn)
    print(json.dumps(rows, indent=2, default=str))


def _integrations() -> None:
    for key in registry.list_keys():
        spec = registry.resolve(key)
        print(
            f"{key}: {spec.provider}/{spec.model} (fallback {spec.fallback_provider}/{spec.fallback_model})"
        )


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.llm.cli")
    parser.add_argument("command", choices=["smoke", "usage", "integrations"])
    command = parser.parse_args().command
    {"smoke": _smoke, "usage": _usage, "integrations": _integrations}[command]()


if __name__ == "__main__":
    main()
