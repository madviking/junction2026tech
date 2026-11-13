# scripts

Repository tooling. Stdlib-only Python so it runs before any setup.

- `policy/check_repo_policy.py`: policy checks run first by `dev_readiness_check.sh`
  (doc metadata, module READMEs, skill references, line limits, LLM boundary,
  secret patterns). Change a rule only with team agreement; never to get green.
