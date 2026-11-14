# admin-journey

Journey editor: the draft's journey (stages → outcome cards → next stage) as a graph,
structural edits, and the same validation publish runs, with the clinical/legal review
flags beside it. Backend: `backend/content/README.md` ("Journey editor",
`api.content.journey*`).

## Feature flag (on in local dev and in the deployed app)

Two flags, both must be on. `make dev-backend` / `make dev-frontend` and the
`.claude/launch.json` preview servers turn both on locally (override with `=false`). The
deployed app turns both on too: `frontend/Dockerfile` (build arg, default `true`) and
`deploy/aiven/Dockerfile` (`ENV`, overridable in the Runtime app's environment). A plain
`npm run build` or `encore build docker` leaves them off. The view-only demo account sees
the editor but every write is refused (`requireAdmin()`).

- Frontend `VITE_FEATURE_JOURNEY_EDITOR=true` (read in `src/app/features.ts` at build or
  dev-server start). Off: no `/admin/journey` route and no "Journey" nav entry; the page
  is not in any chunk that loads.
- Backend `SILTA_FEATURE_JOURNEY_EDITOR=true` (`backend/content/features.ts`). Off: the
  graph endpoint returns `enabled: false` (the page then says the editor is turned off)
  and every write is refused with `failed_precondition`.

There is no `frontend/.env.example`; set the variable in the shell, e.g.
`VITE_FEATURE_JOURNEY_EDITOR=true npm run dev`.

## Page

`JourneyEditorPage` (`/admin/journey`, only when the flag is on):

- Header: draft or live (no draft yet), "Based on version N", **Add stage**, **Draft and
  publish** (goes to `/admin/content`, where publishing happens). A warning banner when the
  draft has errors: publishing is refused until they are fixed.
- Validation strip above the graph (full width): error and warning counts, the issues
  (errors red, warnings amber, "Show" jumps to the stage), and review-flag counts by kind
  (clinical, legal). The review-flag list is folded until "Show review flags"; flags inside
  the journey have "Show" to jump to their stage.
- Graph (`ColumnBoard` from `@/shared/ui/extra/ColumnBoard`, full width, horizontal
  scroll): columns by distance from the start stage (breadth-first over outcome `next`),
  then the stages reached only through an interrupt, then "Not reachable". Each stage is a
  card with its question, badges (start, terminal, not reachable, error count), a remove
  icon in the header, "From …" (the stages and interrupts that lead to it, each a link
  back; "Nothing leads here." when none) and its outcomes as "card text / id → target"
  with change-target and remove icons (`IconButton`) beside the card text. The target button
  scrolls to that stage, focuses and outlines it. A `next` that names no stage shows
  "missing stage <id>" plus the validation message. Terminal stages have no "Add outcome".
- Interrupts are listed under the graph.
- Edits open a `SideDrawer`: add stage (id, terminal, question en + fi), add outcome (id,
  card en + fi, leads to = a stage or "another id (not a stage yet)"), change where an
  outcome leads. Other languages are added in the content editor. Removing a stage or an
  outcome asks inline first; the server's refusal (for example the outcomes still leading
  to a stage) is shown in place. The start stage and `closed` have no remove button.
- Every write returns the fresh graph (replaces the cached one) and refreshes the
  `admin-content` queries by key prefix (the draft panel shares the draft).

## Files

```text
JourneyEditorPage.tsx      page (composition only)
api/                       keys, useJourneyGraph, write hooks (useAddStage, …)
components/                StageCard, OutcomeRow, JourneyGraphView, IssuesPanel, IssueLine,
                           InterruptsList, JourneyEditDrawer, EditForms, NextStageField,
                           RemoveConfirm
lib/layout.ts              column layout (BFS), issue lookups, id rule
lib/nextStage.ts           "leads to" value helpers, issue → stage
lib/errors.ts              readable refusal messages
state/useHighlight.ts      highlighted stage (clears after 2.5 s)
testGraph.ts               fixture for the unit tests
```

## Test

```bash
npx vitest run src/features/admin-journey     # layout + page (fetch stubbed)
```

Browser proof: `frontend/e2e/admin/journey-editor.spec.ts`. It skips itself unless the
backend graph says `enabled: true`; run it against a frontend started with the flag, e.g.
`VITE_FEATURE_JOURNEY_EDITOR=true FRONTEND_PORT=5301 npx vite` and
`E2E_BASE_URL=http://localhost:5301 npx playwright test --project=admin e2e/admin/journey-editor.spec.ts`.
