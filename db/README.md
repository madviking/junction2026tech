# db

Plain SQL migrations, applied in order by the `migrations` service in
`compose.yaml` (`migrate/migrate`). The file format matches Encore `sqldb`
migrations so the same files keep working if the backend moves to Encore.

- Name: `migrations/<n>_<snake_case_name>.up.sql`, `n` = previous + 1.
- Forward only. Never edit a migration that has run on a shared or deployed
  database; add a new one.
- Apply locally: `make migrate` (or `make up`, which runs it).
- Product data and its tables: one module owns each table; name it in that
  module's README.

| Migration | Owner | Tables |
| --- | --- | --- |
| `1_llm_usage` | `backend/app/llm` | `llm_usage` |
