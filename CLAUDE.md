Status: active
Last reviewed: 2026-11-13

# Claude Guide

@AGENTS.md

`AGENTS.md` (imported above) is the single source of truth for every agent. This
file only adds Claude-specific notes; do not duplicate repo rules here.

## Claude-specific notes

- Skills: `.claude/skills` is a relative symlink to `.codex/skills`. A
  `.codex/skills/<name>/SKILL.md` path in `AGENTS.md` is the same skill Claude
  loads by `<name>`. Add or edit skills only under `.codex/skills/`.
- Model recommendation from `task-sizing-workflow`: `bug fix` / `minor change` →
  Haiku or Sonnet; `new feature` → Sonnet; `big feature / refactor` → Opus.
  Advisory only.
- Subagents: use them for parallel investigation or mechanical edits with a
  cheaper model; review their output yourself and run final verification.
- Git: mutating git commands are denied in `.claude/settings.json`. Do not work
  around the deny list; ask the user to run the command.
- Personal permission allowlists belong in `.claude/settings.local.json`
  (gitignored), not in `.claude/settings.json`.
- `.claude/launch.json` defines the `frontend` and `backend` dev servers for the
  desktop app's preview pane.
