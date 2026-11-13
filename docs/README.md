Status: active
Last reviewed: 2026-11-14

# Documentation Standards

Docs exist so a teammate or an agent arriving cold can act within minutes. Write
the minimum that achieves that, keep it next to the code it describes, and delete
it when it stops being true.

## Where things go

| Kind | Location | Metadata header |
| --- | --- | --- |
| Agent entry point and hard rules | `AGENTS.md` (Claude reads it via `CLAUDE.md`) | yes |
| How a module works, how to extend it | `README.md` in the module (`backend/<service>/`, `frontend/src/features/<name>/`) | no |
| Cross-cutting architecture and operations | `docs/*.md` | yes |
| Decisions that would surprise a teammate | `docs/decisions/<nnnn>-<slug>.md` | yes |
| Plans for multi-module or multi-session work | `docs/planning/<yyyy-mm-dd>-<slug>.md` from `_template.md` | yes |
| Repeatable agent workflows ("always do X when Y") | `.codex/skills/<name>/SKILL.md` | YAML front matter |

The metadata header is the first two lines:

```text
Status: active | draft | deprecated
Last reviewed: YYYY-MM-DD
```

`scripts/policy/check_repo_policy.py` (run by the readiness gate) enforces the
header, module READMEs and skill references.

## Rules

- One truth per topic. Module internals live only in the module README; `docs/`
  links to it instead of copying it.
- If a doc conflicts with code or tests, the code wins: fix the doc in the same
  change.
- Obsolete docs are deleted (git keeps history), not left as alternatives.
- Write for action: commands that run as written, exact paths, current ports.
  No marketing prose, no speculative roadmaps.
- A rule that agents must follow every time belongs in a skill or in `AGENTS.md`,
  not buried in a long doc.
- No secrets, personal data, internal hostnames or credentials in any doc. This
  repository may become public for judging.

## Current docs

- `architecture.md`: components, data flow, ports and boundaries.
- `deployment.md`: the self-hosted image, Aiven and where the app runs.
- `decisions/0002-encore-ts-on-aiven.md`: Encore.ts, self-hosted, Aiven PostgreSQL, same-region rule.
- `decisions/0001-backend-runtime.md`: superseded by 0002.
- `planning/_template.md`: plan + acceptance matrix template.

## Decision records

Short is fine. Use: context (two sentences), decision, consequences, and what
would make us revisit it. Number sequentially.
