---
name: readiness-gate
description: Use for default verification before reporting any change done. Runs the repo policy checks and the backend/frontend/API-client checks selected by the changed paths, with compact reporting.
---

# Readiness Gate

## Commands

```bash
bash dev_readiness_check.sh                          # scope = changed + untracked files
bash dev_readiness_check.sh --paths backend/foo frontend/src/features/foo   # your slice only
bash dev_readiness_check.sh --all                    # everything
bash dev_readiness_check.sh --report-json tmp/readiness.json
```

Use `--paths` when other people or agents have unrelated dirty files in the same
checkout. Use `--all` after changes to shared code, tooling, dependencies,
or the API client.

## What runs

| Step | Runs when scope touches | Command |
| --- | --- | --- |
| `policy` | always | `python3 scripts/policy/check_repo_policy.py` |
| `backend_typecheck` | `backend/**` | `tsc --noEmit` |
| `backend_tests` | `backend/**` | `encore test` (needs the Encore CLI and Docker) |
| `api_client` | `backend/**`, `frontend/src/shared/api/**` | `encore gen client` output equals `frontend/src/shared/api/client.ts` |
| `frontend_lint` | `frontend/**` | `eslint` (errors fail; changed files must have zero warnings) |
| `frontend_typecheck` | `frontend/**` | `tsc --noEmit` |
| `frontend_tests` | `frontend/**` | `vitest run` |
| `frontend_build` | `frontend/**` | `vite build` |

The policy check covers: doc metadata headers, module READMEs, skill references,
file line limits, LLM boundary (no provider URLs/SDKs/model IDs outside
`backend/llm/`), and secret patterns.

## When it fails

- Fix failures in files you touched.
- Failures caused by someone else's unrelated dirty files: report them with the
  rerun command; do not edit those files.
- Never weaken a rule, add an ignore or raise a limit to get green without the
  user's agreement. If a rule is wrong for the hackathon, say so and propose the
  change.

## Reporting

Report only: command, pass/fail per step, the failing files/tests and the rerun
command. Do not paste green logs.
