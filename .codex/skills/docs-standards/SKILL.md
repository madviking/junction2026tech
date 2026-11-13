---
name: docs-standards
description: Use for doc-only or doc-heavy changes, including AGENTS.md, CLAUDE.md, module READMEs, plans, decisions and skills. Keeps docs canonical, short and next to the code.
---

# Docs Standards

Read `docs/README.md` (the standard) and the nearest module README for the topic.

## Rules

- Module behavior → module `README.md`. Cross-cutting → `docs/`. Plans →
  `docs/planning/`. Decisions → `docs/decisions/`. Must-follow agent workflows →
  `.codex/skills/<name>/SKILL.md`.
- `AGENTS.md` stays a router: hard rules and pointers, not procedures. Claude
  reads it through `CLAUDE.md`; never duplicate rules in `CLAUDE.md`.
- Docs under `docs/`, `AGENTS.md` and `CLAUDE.md` start with `Status:` and
  `Last reviewed:` lines; update `Last reviewed` when you change the substance.
- If docs and code disagree, fix the docs in the same change.
- Delete obsolete docs. Do not keep two versions of the truth.
- No secrets, internal hostnames, personal data or credentials anywhere.

## Skills

- One directory per skill: `.codex/skills/<name>/SKILL.md` with front matter
  `name` (matching the directory) and a `description` that says when to use it.
- Reference skills from `AGENTS.md` by full path so every agent can find them.
- Keep a skill under ~150 lines; link to module READMEs for detail.

## Verification

```bash
python3 scripts/policy/check_repo_policy.py
bash dev_readiness_check.sh
```
