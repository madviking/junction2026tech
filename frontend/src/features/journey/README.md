# journey

The resident journey (first build, 2026-11-14): start screen and one screen per journey
stage of an anonymous visit. The server decides everything (engine, lane from symptom
cards, care path); the client shows the current stage from `VisitView` and sends the
tapped outcome.

## Routes (wired in `src/app/residentRoutes.tsx`)

| Path | Page | Shows |
| --- | --- | --- |
| `/r/:lang` | `JourneyStartPage` | what Silta does, privacy promise, Start (`POST /api/visits`), "I have a code" (resume) |
| `/r/:lang/v/:code` | `JourneyPage` | the visit's current stage; unknown code → error + back to start |

The visit card (`/r/:lang/v/:code/card`) belongs to `features/visit-card`; the `visit`
stage links to it.

## Stage registry (`registry.ts`)

Not a switch. `stageComponents: Record<stageId, StageComponent>` maps a stage to a
special screen; any stage without an entry renders `StageCards` (question + outcome
cards + free text). `outcomeCards` (`outcomeCards.ts`, outcome id → card) works the same
way with `DefaultOutcomeCard` (a ChoiceCard with its play button) as the fallback; it is
empty tonight.

| Stage | Entry | Screen |
| --- | --- | --- |
| `describe`, `wait`, `followup`, new stages | default `StageCards` | question, outcome cards, `MatchInput` (set `outcomes`) |
| `route` | `RouteStage` | route questions as guidance, route cards (`route.<code>.card`), `MatchInput` set `route`, other outcomes ("not sure") |
| `contact` | `ContactStage` | door: title, door, note; Finnish script (`scriptFi`, play in Finnish) + meaning (`scriptLocal`); clocks with basis badge; outcome cards |
| `stalled` | `StalledStage` | escalation ladder (`StepList`, current rung) + outcome cards |
| `emergency` | `EmergencyStage` | 112 (the PageShell slot) and the emergency signs; below them only "something changed" to go back |
| `visit` | `VisitStage` | "Show your visit card" + default cards |
| `closed` | `ClosedStage` | closing text + reopen card |

Outcome taps go through `OutcomeChooser`, driven by the content structure: an outcome
with `sets: 'lane'` opens the `SymptomPicker` (multi-select symptom cards + free text;
sends `{ outcome, symptoms }`), one with `sets: 'route'` opens the route cards (sends
`{ outcome, route }`), one with `records: 'visit_date'` asks for an optional date (sends
`visitDate`), any other is sent as is. That is why `describe` needs no entry.

Adding a stage or outcome in the content needs no code. A special screen is one new
component (taking `StageProps`) plus one line in `stageComponents`.

Every screen: the then-text of the last tap in a `Banner` (with its audio when a key
holds it), the emergency interrupt (interrupt whose `next` is `emergency`) in the
PageShell emergency slot under the 112 link, other interrupts ("something changed") as
secondary actions, the visit code at the bottom, `PlaceholderNotice` for so/ar.
Interrupts come from `VisitView.interrupts` (the server lists the ones available on its
stage); the client also drops any whose `next` is the stage already shown.

**Emergency is offline-safe.** Tapping the emergency interrupt shows `EmergencyStage`
at once from the loaded content (`bundle.cards.emergencySigns`) and sends the event in
the background; if the request fails the screen stays and no error is shown
(`JourneyScreen`, local `localEmergency` state). "Something changed" leads back.

**Audio.** Every card, question, instruction, ladder rung, emergency sign, clock label
(`rule.<lane>[.<route>].clocks|no_guarantee.<i>.label`) and the door note
(`route.<code>.note`) has a `CardAudioButton`. Composed texts without one key stay
silent: the destination title (rule title with `{door}`), "Where: {door}" and the clock
limits line, and the "Your code" line.

## MatchInput (`components/MatchInput.tsx`)

Text field ("Describe in your own words") + `RecordAnswerButton` → `POST /api/cards/match`.
`confirm` → read-back "Did you mean: …?" with a play button and Yes / No; only Yes calls
`onChosen`. `choose`, No or an error → a short message and the cards stay to tap. It never
chooses on its own. In the symptom picker Yes selects the card (Continue still sends).

## Files

`api/` TanStack Query hooks (`useVisit`, `useVisitEvent`, `useCreateVisit`,
`useCardMatch`; keys start with `journey`) · `components/` (never fetch; stages get
`send` and `match` from the page) · `keys.ts` content text keys (also audio keys) ·
`code.ts` unknown-code check (`not_found` only); code normalisation is
`@/shared/visitCode` (mirror of the backend rules) · `types.ts` generated-type aliases ·
UI strings `ui.journey.*` in `backend/care_paths/seed/ui/journey.yaml`.

## Test

```bash
npx vitest run src/features/journey                        # fetch stubbed
npx playwright test --project=resident e2e/resident/journey.spec.ts   # running app; test (d) makes 2 live match calls
```

## Visit date

An outcome whose structure has `records: 'visit_date'` (e.g. contact → got_time) asks for the
appointment date in `OutcomeChooser` before sending; the date is optional ("Continue without a date").
Strings `ui.journey.visit_date.*`.
