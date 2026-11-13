"""Load per-feature model choices from integrations/<key>.yaml."""

import os
import re
from functools import lru_cache
from pathlib import Path

import yaml

from app.llm.errors import LLMConfigError
from app.llm.schemas import IntegrationSpec

INTEGRATIONS_DIR = Path(__file__).parent / "integrations"
_REQUIRED = ("key", "description", "provider", "model")


def env_override_name(key: str) -> str:
    return "LLM_MODEL__" + re.sub(r"[^A-Z0-9]", "_", key.upper())


@lru_cache
def load_spec(key: str, directory: Path = INTEGRATIONS_DIR) -> IntegrationSpec:
    path = directory / f"{key}.yaml"
    if not path.is_file():
        raise LLMConfigError(f"integration_seed_missing:{key}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    missing = [name for name in _REQUIRED if not raw.get(name)]
    if missing:
        raise LLMConfigError(f"integration_seed_invalid:{key}:missing={','.join(missing)}")
    if raw["key"] != key:
        raise LLMConfigError(f"integration_seed_invalid:{key}:key_mismatch")
    return IntegrationSpec(
        key=raw["key"],
        description=raw["description"],
        provider=raw["provider"],
        model=raw["model"],
        fallback_provider=raw.get("fallback_provider"),
        fallback_model=raw.get("fallback_model"),
        temperature=raw.get("temperature"),
        max_tokens=raw.get("max_tokens"),
        prompts=tuple(raw.get("prompts") or ()),
    )


def resolve(key: str, directory: Path = INTEGRATIONS_DIR) -> IntegrationSpec:
    """Seed values, with the model optionally replaced by LLM_MODEL__<KEY>."""
    spec = load_spec(key, directory)
    override = os.environ.get(env_override_name(key), "").strip()
    if not override:
        return spec
    return IntegrationSpec(**{**spec.__dict__, "model": override})


def list_keys(directory: Path = INTEGRATIONS_DIR) -> list[str]:
    return sorted(path.stem for path in directory.glob("*.yaml"))
