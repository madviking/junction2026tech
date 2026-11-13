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
