#!/usr/bin/env python3
"""Repository policy checks (stdlib only). Run: python3 scripts/policy/check_repo_policy.py

Checks: doc metadata, module READMEs, skill references, file line limits,
LLM provider boundary, and committed-secret patterns. Exit 1 on any violation.
"""

from __future__ import annotations

import os
import re
import subprocess
import sys
from collections.abc import Callable, Iterable
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKIP_DIRS = {".git", "node_modules", ".venv", "dist", "coverage", "__pycache__", ".pytest_cache",
             ".ruff_cache", "test-results", "playwright-report", "tmp", "scratch"}
LINE_LIMITS = {".py": 500, ".ts": 400, ".tsx": 400}
LINE_LIMIT_EXEMPT = ("frontend/src/shared/api/generated/",)

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
STATUS_RE = re.compile(r"^Status: (active|draft|deprecated)\s*$")
REVIEWED_RE = re.compile(r"^Last reviewed: (\S+)\s*$")
SKILL_REF_RE = re.compile(r"\.codex/skills/([a-z0-9-]+)/SKILL\.md")

LLM_ALLOWED_PREFIX = "backend/app/llm/"
PROVIDER_URL_RE = re.compile(
    r"(openrouter\.ai|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.groq\.com)"
)
PROVIDER_SDK_RE = re.compile(
    r"^\s*(?:import|from)\s+(openai|anthropic|litellm|groq|mistralai|google\.generativeai)\b"
    r"|from\s+['\"](openai|@anthropic-ai/sdk|ai|@ai-sdk/[\w-]+)['\"]",
    re.MULTILINE,
)
MODEL_LITERAL_RE = re.compile(
    r"['\"](?:(?:openai|anthropic|google|meta-llama|mistralai|qwen|deepseek|x-ai|cohere|perplexity)/[\w.:-]+"
    r"|(?:gpt-[\w.-]+|claude-[\w.-]+|gemini-[\w.-]+|o[134]-(?:mini|preview)[\w.-]*))['\"]"
)
SECRET_RES = [
    ("openrouter key", re.compile(r"sk-or-v1-[0-9a-f]{20,}")),
    ("anthropic key", re.compile(r"sk-ant-[A-Za-z0-9_-]{20,}")),
    ("openai key", re.compile(r"sk-(?!or-|ant-)(?:proj-)?[A-Za-z0-9_-]{40,}")),
    ("aws access key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("google api key", re.compile(r"AIza[0-9A-Za-z_-]{35}")),
    ("github token", re.compile(r"gh[pousr]_[A-Za-z0-9]{36}")),
    ("private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
]
SECRET_SKIP_SUFFIXES = (".lock", "package-lock.json", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2")


def repo_files() -> list[str]:
    """Tracked + untracked, non-ignored files (read-only git), else a filesystem walk."""
    try:
        out = subprocess.run(
            ["git", "ls-files", "-co", "--exclude-standard"],
            cwd=ROOT, capture_output=True, text=True, check=True, timeout=30,
        ).stdout
        files = [line for line in out.splitlines() if line]
    except (OSError, subprocess.SubprocessError):
        files = []
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for name in filenames:
                files.append(str(Path(dirpath, name).relative_to(ROOT)))
    return sorted(
        f for f in files
        if not set(Path(f).parts) & SKIP_DIRS and (ROOT / f).is_file() and not (ROOT / f).is_symlink()
    )


def read(path: str) -> str:
    try:
        return (ROOT / path).read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return ""


def check_doc_metadata(files: list[str]) -> list[str]:
    docs = [f for f in files if f in {"AGENTS.md", "CLAUDE.md"} or (f.startswith("docs/") and f.endswith(".md"))]
    problems = []
    for path in docs:
        head = read(path).splitlines()[:5]
        if not any(STATUS_RE.match(line) for line in head):
            problems.append(f"{path}: missing 'Status: active|draft|deprecated' in the first lines")
        reviewed = next((m.group(1) for line in head if (m := REVIEWED_RE.match(line))), None)
        is_template = Path(path).name.startswith("_")
        if reviewed is None or (not is_template and not DATE_RE.match(reviewed)):
            problems.append(f"{path}: missing 'Last reviewed: YYYY-MM-DD' in the first lines")
    return problems


def check_module_readmes(files: list[str]) -> list[str]:
    modules: set[str] = set()
    for path in files:
        parts = Path(path).parts
        if len(parts) >= 4 and parts[:2] == ("backend", "app") and path.endswith(".py"):
            modules.add("/".join(parts[:3]))
        if len(parts) >= 5 and parts[:3] == ("frontend", "src", "features"):
            modules.add("/".join(parts[:4]))
    return [f"{m}/: missing README.md" for m in sorted(modules) if not (ROOT / m / "README.md").is_file()]


def check_skills(files: list[str]) -> list[str]:
    problems = []
    skills_dir = ROOT / ".codex" / "skills"
    existing = set()
    for skill_md in sorted(skills_dir.glob("*/SKILL.md")):
        name = skill_md.parent.name
        existing.add(name)
        text = skill_md.read_text(encoding="utf-8")
        front = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
        if not front:
            problems.append(f".codex/skills/{name}/SKILL.md: missing YAML front matter")
            continue
        fields = dict(re.findall(r"^(\w+):\s*(.+)$", front.group(1), re.MULTILINE))
        if fields.get("name") != name:
            problems.append(f".codex/skills/{name}/SKILL.md: front matter name must be '{name}'")
        if len(fields.get("description", "")) < 20:
            problems.append(f".codex/skills/{name}/SKILL.md: description must say when to use the skill")
    for path in files:
        if not path.endswith(".md"):
            continue
        for ref in SKILL_REF_RE.findall(read(path)):
            if ref not in existing:
                problems.append(f"{path}: references missing skill .codex/skills/{ref}/SKILL.md")
    return problems


def check_line_limits(files: list[str]) -> list[str]:
    problems = []
    for path in files:
        limit = LINE_LIMITS.get(Path(path).suffix)
        if limit is None or path.startswith(LINE_LIMIT_EXEMPT):
            continue
        count = read(path).count("\n") + 1
        if count > limit:
            problems.append(f"{path}: {count} lines > {limit}; split it by responsibility")
    return problems


def _code_files(files: Iterable[str]) -> list[str]:
    roots = ("backend/", "frontend/src/", "frontend/e2e/")
    return [f for f in files if f.startswith(roots) and Path(f).suffix in {".py", ".ts", ".tsx", ".js"}]


def check_llm_boundary(files: list[str]) -> list[str]:
    problems = []
    for path in _code_files(files):
        if path.startswith(LLM_ALLOWED_PREFIX) or path.startswith("frontend/src/shared/api/generated/"):
            continue
        text = read(path)
        for regex, what in (
            (PROVIDER_URL_RE, "provider URL"),
            (PROVIDER_SDK_RE, "provider SDK import"),
            (MODEL_LITERAL_RE, "model ID literal"),
        ):
            for match in regex.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                problems.append(f"{path}:{line}: {what} outside backend/app/llm ({match.group(0).strip()})")
    return problems


def check_secrets(files: list[str]) -> list[str]:
    problems = []
    for path in files:
        if path.endswith(SECRET_SKIP_SUFFIXES):
            continue
        text = read(path)
        for label, regex in SECRET_RES:
            for match in regex.finditer(text):
                line = text.count("\n", 0, match.start()) + 1
                problems.append(f"{path}:{line}: looks like a {label}; remove it and rotate the key")
    return problems


CHECKS: list[tuple[str, Callable[[list[str]], list[str]]]] = [
    ("doc_metadata", check_doc_metadata),
    ("module_readmes", check_module_readmes),
    ("skills", check_skills),
    ("line_limits", check_line_limits),
    ("llm_boundary", check_llm_boundary),
    ("secrets", check_secrets),
]


def main() -> int:
    files = repo_files()
    failed = 0
    for name, check in CHECKS:
        problems = check(files)
        print(f"[policy] {name}: {'ok' if not problems else f'{len(problems)} problem(s)'}")
        for problem in problems:
            print(f"  - {problem}")
        failed += bool(problems)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
