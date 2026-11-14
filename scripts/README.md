# scripts

Repository tooling. Stdlib-only Python so it runs before any setup.

- `policy/check_repo_policy.py`: policy checks run first by `dev_readiness_check.sh`
  (doc metadata, module READMEs, skill references, line limits, LLM boundary,
  secret patterns). Change a rule only with team agreement; never to get green.
- `aiven.py`: `migrate`, `run` and `url` against Aiven from a laptop, reading
  `.env` and `backend/infra.config.json` (behind `make migrate-aiven` / `run-image`).
- `phone_agent.py`: the Silta phone line. `sync` creates or updates the ElevenLabs agent
  and its two webhook tools (care-path compose, area doors) against the deployed API;
  `import-number +<E.164>` attaches a Twilio number (`TWILIO_SID`, `TWILIO_TOKEN`);
  `show` lists agent, tools and numbers. The agent's LLM (Gemini) runs inside ElevenLabs,
  so its calls do not go through `backend/llm` and do not write `llm_usage` rows; spend
  shows in the ElevenLabs dashboard. Proof: `docs/proof/2026-11-14/phone-agent.md`.
  `LANGS` must hold every app language except English; `python3 -m unittest
  scripts/test_phone_agent.py` (offline) fails when one is missing.
