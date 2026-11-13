"""File-backed prompt templates with strict {placeholder} rendering."""

import re
from functools import lru_cache
from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"
_PLACEHOLDER = re.compile(r"\{([a-z_][a-z0-9_]*)\}")


class PromptError(Exception):
    pass


@lru_cache
def load_prompt(name: str, directory: Path = TEMPLATES_DIR) -> str:
    path = directory / f"{name}.txt"
    if not path.is_file():
        raise PromptError(f"prompt_missing:{name}")
    return path.read_text(encoding="utf-8").strip()


def render_prompt(name: str, directory: Path = TEMPLATES_DIR, **values: object) -> str:
    """Replace {key} placeholders. Missing or unused values raise, so typos fail loudly."""
    template = load_prompt(name, directory)
    wanted = set(_PLACEHOLDER.findall(template))
    missing = wanted - values.keys()
    unused = values.keys() - wanted
    if missing or unused:
        raise PromptError(f"prompt_values_mismatch:{name}:missing={sorted(missing)}:unused={sorted(unused)}")
    return _PLACEHOLDER.sub(lambda match: str(values[match.group(1)]), template)
