Status: active
Last reviewed: 2026-11-14

# 0003 — One versioned content document

## Context

Silta's care paths, journey stages, cards and every user-facing text in four languages
must be editable by the team without code, reviewed per language, published as a whole,
rolled back, and exported back to `rules.yaml`. The journey editor (later) edits the
structure itself.

## Decision

- All content is one JSON document (`ContentDoc`: structure + cards + texts + languages),
  stored per release in `content_releases.doc` (TEXT holding JSON, because jsonb reorders
  keys and order is meaningful). `content_live` points at the live published release; at
  most one draft row exists.
- Wording, English included, lives only in `texts` under keys derived from the structure
  (`care_paths/domain/keys.ts`). The structure holds codes, flags and links.
- Every publish validates the whole document (`care_paths/domain/validate.ts`); an invalid
  draft is refused and live stays unchanged. Rollback re-points live; versions are kept.
- `backend/care_paths/seed/` is the seed, loaded as version 1 on an empty database.
- Audio is not in the document: `voice` keys audio by text hash, so a text change makes
  its old audio stale with no bookkeeping.

## Consequences

- Publish, rollback and export are atomic and simple; the journey editor edits the same
  `structure` with no storage change.
- Every release stores a full copy (~100 KB). Fine for hundreds of versions.
- Two editors in parallel share one draft (last write wins per text). Acceptable for a
  small team; revisit with per-user drafts if it bites.
- Encore's JSON encoder sorts object keys, so the document travels between services as
  JSON text and public responses use ordered arrays.

## Revisit when

Content grows past a few MB, or several teams need independent drafts.
