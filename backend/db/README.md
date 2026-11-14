# db

Declares the shared `silta` database (`db.ts`) and owns its migrations. Every
other service reaches it with `SQLDatabase.named('silta')`.

- Name: `migrations/<n>_<snake_case_name>.up.sql`, `n` = previous + 1
  (the format golang-migrate also reads).
- Forward only. Never edit a migration that has run on Aiven or on a teammate's
  machine; add a new one.
- Local: `encore run` applies pending migrations at start.
  `encore db shell silta` opens psql; `encore db reset silta` wipes local data.
- Aiven: the self-hosted image does **not** migrate. Run `make migrate-aiven`
  before starting a new image (see `backend/README.md`).
- One service owns each table and names it in its README.

| Migration | Owner | Tables |
| --- | --- | --- |
| `1_llm_usage` | `llm` | `llm_usage` |
| `2_init_silta` | `db` | none (`vector` extension) |
| `3_content_releases` | `content` | `content_releases`, `content_live` |
| `4_admin` | `admin` | `admin_users`, `admin_sessions`, `audit_log` |
| `5_voice` | `voice` | `audio_blobs`, `audio_assets`, `voice_usage` |
| `6_visits` | `visits` | `visits`, `visit_events` |
| `7_county_figures` | `regions` | `counties`, `county_figures`, `county_languages` |
| `8_llm_usage_cost_precision` | `llm` | `llm_usage` (`cost_usd` to NUMERIC(16, 10)) |
| `9_visit_clinician_move` | `visits` | `visit_events` (kind `clinician_move`) |
