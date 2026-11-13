-- pgvector for the embeddings table (added with the first feature that needs it).
-- Encore's local Postgres ships it; on Aiven the avnadmin user may create it.
CREATE EXTENSION IF NOT EXISTS vector;
