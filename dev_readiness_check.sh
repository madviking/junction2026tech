#!/usr/bin/env bash
# Readiness gate. Run before reporting any change done.
#   bash dev_readiness_check.sh                       # scope = changed + untracked files (git status)
#   bash dev_readiness_check.sh --paths <p> [<p>...]  # scope = these paths (your slice only)
#   bash dev_readiness_check.sh --all                 # everything
#   --report-json <file>                              # machine-readable step results
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

ORIG_ARGS="$*"
MODE="changed"
REPORT_JSON=""
SCOPE_PATHS=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    --all) MODE="all"; shift ;;
    --paths)
      MODE="paths"; shift
      while [ "$#" -gt 0 ] && [[ "$1" != --* ]]; do SCOPE_PATHS+=("${1%/}"); shift; done
      [ "${#SCOPE_PATHS[@]}" -gt 0 ] || { echo "--paths needs at least one path" >&2; exit 2; } ;;
    --report-json) REPORT_JSON="${2:?--report-json needs a file}"; shift 2 ;;
    -h|--help) sed -n '2,7p' "$0"; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

STEPS_TSV="$(mktemp)"
LOG_DIR="$(mktemp -d)"
trap 'rm -f "$STEPS_TSV"' EXIT

record() { printf '%s\t%s\t%s\n' "$1" "$2" "$3" >> "$STEPS_TSV"; }

# run_step <id> <description> <dir> <command...>: output goes to a log, shown only on failure.
run_step() {
  local id="$1" desc="$2" dir="$3"; shift 3
  printf '[ready] %-20s ' "$id"
  if (cd "$dir" && "$@") > "$LOG_DIR/$id.log" 2>&1; then
    echo "ok"; record "$id" passed "$desc"
  else
    echo "FAILED  ($desc)"; record "$id" failed "$desc"
    tail -n 40 "$LOG_DIR/$id.log" | sed 's/^/    /'
    echo "    full log: $LOG_DIR/$id.log"
  fi
}

skip_step() { printf '[ready] %-20s skipped (%s)\n' "$1" "$2"; record "$1" skipped "$2"; }

# ---------- scope ----------
CHANGED=()
if [ "$MODE" = "changed" ]; then
  if git -C "$ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    while IFS= read -r line; do
      path="${line:3}"; path="${path##* -> }"; path="${path%\"}"; path="${path#\"}"
      [ -n "$path" ] && CHANGED+=("$path")
    done < <(git -C "$ROOT" status --porcelain --untracked-files=all)
  else
    MODE="all"
  fi
elif [ "$MODE" = "paths" ]; then
  CHANGED=("${SCOPE_PATHS[@]}")
fi

in_scope() {  # in_scope <prefix-or-glob>...
  [ "$MODE" = "all" ] && return 0
  local path pattern
  for path in "${CHANGED[@]+"${CHANGED[@]}"}"; do
    for pattern in "$@"; do
      # shellcheck disable=SC2053
      if [[ "$path" == $pattern* || "$pattern" == "$path"/* ]]; then return 0; fi
    done
  done
  return 1
}

echo "[ready] scope: $MODE ${CHANGED[*]+(${#CHANGED[@]} paths)}"

# ---------- always ----------
run_step policy "repo policy checks" "$ROOT" python3 scripts/policy/check_repo_policy.py

# ---------- backend ----------
if in_scope backend/ db/; then
  if command -v uv >/dev/null 2>&1; then
    run_step backend_lint "ruff check + format --check" backend bash -c "uv run ruff check . && uv run ruff format --check ."
    run_step backend_tests "pytest" backend uv run pytest -q -p no:warnings
  else
    record backend_prereq failed "uv not installed (https://docs.astral.sh/uv/)"; echo "[ready] backend_prereq FAILED: uv not installed"
  fi
else
  skip_step backend "no backend/db changes"
fi

# ---------- API contract ----------
if in_scope backend/ contracts/ frontend/src/shared/api/; then
  if [ -d frontend/node_modules ] && command -v uv >/dev/null 2>&1; then
    run_step api_contract "contracts/openapi.json and generated TS are current (fix: make api)" "$ROOT" bash -c '
      tmp="$(mktemp -d)"
      (cd backend && uv run python scripts/export_openapi.py "$tmp/openapi.json") &&
      diff -q "$tmp/openapi.json" contracts/openapi.json &&
      (cd frontend && npx openapi-typescript "$tmp/openapi.json" -o "$tmp/openapi.ts" >/dev/null) &&
      diff -q "$tmp/openapi.ts" frontend/src/shared/api/generated/openapi.ts'
  else
    record api_contract failed "needs uv and frontend/node_modules (make setup)"; echo "[ready] api_contract FAILED: run make setup"
  fi
else
  skip_step api_contract "no contract-related changes"
fi

# ---------- frontend ----------
if in_scope frontend/; then
  if [ -d frontend/node_modules ]; then
    run_step frontend_lint "eslint (errors fail)" frontend npx eslint .
    LINT_TARGETS=()
    if [ "$MODE" != "all" ]; then
      for path in "${CHANGED[@]+"${CHANGED[@]}"}"; do
        if [[ "$path" == frontend/* && "$path" =~ \.(ts|tsx|js)$ && -f "$path" ]]; then LINT_TARGETS+=("${path#frontend/}"); fi
      done
    fi
    if [ "${#LINT_TARGETS[@]}" -gt 0 ]; then
      run_step frontend_lint_diff "changed files have zero eslint warnings" frontend npx eslint --max-warnings 0 --no-warn-ignored "${LINT_TARGETS[@]}"
    fi
    run_step frontend_typecheck "tsc --noEmit" frontend npx tsc --noEmit
    run_step frontend_tests "vitest run" frontend npx vitest run
    run_step frontend_build "vite build" frontend npx vite build
  else
    record frontend_prereq failed "frontend/node_modules missing (make setup)"; echo "[ready] frontend_prereq FAILED: run make setup"
  fi
else
  skip_step frontend "no frontend changes"
fi

# ---------- docker ----------
if in_scope compose.yaml compose.production.yaml backend/Dockerfile frontend/Dockerfile frontend/nginx.conf; then
  if command -v docker >/dev/null 2>&1; then
    run_step compose_config "docker compose config (dev + production)" "$ROOT" bash -c '
      docker compose --profile app config -q &&
      DATABASE_URL=postgres://x REDIS_URL=redis://x docker compose -f compose.production.yaml config -q'
  else
    skip_step compose_config "docker not installed"
  fi
else
  skip_step compose_config "no Docker changes"
fi

# ---------- summary ----------
FAILED="$(awk -F'\t' '$2=="failed"' "$STEPS_TSV" | wc -l | tr -d ' ')"
PASSED="$(awk -F'\t' '$2=="passed"' "$STEPS_TSV" | wc -l | tr -d ' ')"

if [ -n "$REPORT_JSON" ]; then
  mkdir -p "$(dirname "$REPORT_JSON")"
  python3 - "$STEPS_TSV" "$REPORT_JSON" "$MODE" <<'PY'
import json, sys
steps = [dict(zip(("step", "status", "details"), line.rstrip("\n").split("\t", 2)))
         for line in open(sys.argv[1], encoding="utf-8") if line.strip()]
report = {"ok": all(s["status"] != "failed" for s in steps), "scope": sys.argv[3], "steps": steps}
open(sys.argv[2], "w", encoding="utf-8").write(json.dumps(report, indent=2) + "\n")
PY
fi

if [ "$FAILED" -gt 0 ]; then
  echo "[ready] FAILED: $FAILED step(s) failed, $PASSED passed. Rerun: bash dev_readiness_check.sh ${ORIG_ARGS}"
  exit 1
fi
rm -rf "$LOG_DIR"
echo "[ready] OK: $PASSED step(s) passed"
