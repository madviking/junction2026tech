# journey

The resident journey (first build, 2026-11-14): start screen and one screen per journey
stage of an anonymous visit. The server decides everything (engine, lane from symptom
cards, care path); the client shows the current stage from `VisitView` and sends the
tapped outcome.

## Routes (wired in `src/app/residentRoutes.tsx`)

| Path | Page | Shows |
| --- | --- | --- |
| `/r/:lang` | `JourneyStartPage` | what Silta does and the privacy promise in one card with one "Listen" button (`PageAudioButton`), then three cards (screening guide, "I have a code", about); Start (`POST /api/visits`) in the bottom bar |
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
| `contact` | `ContactStage` | door: title, door, note; full call script (`CallScript`, from `carePath.callScript`: greeting, interpreter, checked symptoms, request, "they may ask you", closing; each line Finnish + meaning, play in Finnish and in the person's language); clocks with basis badge; outcome cards |
| `stalled` | `StalledStage` | escalation ladder (`StepList`, current rung) + outcome cards |
| `emergency` | `EmergencyStage` | the emergency signs; the bottom bar holds the large 112 link and "something changed" to go back (no header pill here) |
| `visit` | `VisitStage` | default cards; "Show your visit card" in the bottom bar |
| `closed` | `ClosedStage` | closing text + reopen card |

Outcome taps go through `OutcomeChooser`, driven by the content structure: an outcome
with `sets: 'lane'` opens the `SymptomPicker` (multi-select symptom cards + free text, then
an optional "how long?" choice from `view.durations`; sends `{ outcome, symptoms, duration? }`), one with `sets: 'route'` opens the route cards (sends
`{ outcome, route }`), one with `records: 'visit_date'` asks for an optional date (sends
`visitDate`), any other is sent as is. That is why `describe` needs no entry.

Adding a stage or outcome in the content needs no code. A special screen is one new
component (taking `StageProps`) plus one line in `stageComponents`.

Every screen (`JourneyScreen`):

- Header (`JourneyFrame`): "Silta", the visit code under it, a neutral "Urgent?" button
  (the emergency interrupt, `ui.journey.urgent`) and the one red control, the 112 pill,
  which dials directly.
- `PathProgress` (header strip, `PageProgress`): one segment per care path step and "Your path", with a back arrow in front when `view.canGoBack` (`useVisitBack` → `POST /api/visits/:code/back`, one step back); tapping the strip opens
  `PathOverview` in place: every step with "you are here" (`pathSteps.ts`, from
  `view.carePath.steps[].stage`; the general `step.*` texts until a care path exists),
  "Go back one step" and "Start from the beginning" (the start screen; the old code keeps
  working), the time limits (`ClockList`), the code with the save hint, and a link to the about page.
- The then-text of the last tap in a `Banner` (with its audio when a key holds it).
- The stage. Its main action sits in the sticky bottom bar through `PageActions`:
  Continue (symptoms), "I contacted them" (contact), "Show your visit card" (visit).
- Other interrupts ("something changed") as quiet buttons under the stage.

Layout rules from the mobile audit (`docs/ux-audit/2026-11-14-mobile/audit.md`): one red
control per screen; the action that moves on never scrolls away; helper content
(route questions, time limits, "they may ask you") is closed until tapped (`FaqItem`).

**Contact** shows the door and the script; "I contacted them" swaps the screen to "What
happened?" with the outcome cards (local state, `Back` returns to the script).
**Symptoms**: Continue leads to "how long" as its own step (optional; Continue sends).

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

Always in the bottom bar (`PageActions`), above the screen's main action: one row with the text field ("Describe in your own words" as placeholder) and the compact `RecordAnswerButton`; Check appears once there is text → `POST /api/cards/match`. The read-back and answer cards open above the row.
`confirm` → read-back "Did you mean: …?" with a play button and Yes / No; only Yes calls
`onChosen`. `answer` (a question about a Finnish health care word, "they asked for my Kela
card, what is it?") → an answer card with the question, the answer, a play button
(`glossary.<id>.answer`) and OK, which clears the field; nothing is chosen and the cards
stay. `choose`, No or an error → a short message and the cards stay to tap. It never
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

## Pictures and listening

`outcomeVisuals.ts` gives an outcome card a picture by `<stage>.<outcome>` (the three first-question cards today); outcomes without an entry show none. In the call script each line has one listen button that plays the Finnish phrase and then its meaning (`CardAudioButton thenLang`).

## Visit date

An outcome whose structure has `records: 'visit_date'` (e.g. contact → got_time) asks for the
appointment date in `OutcomeChooser` before sending; the date is optional ("Continue without a date").
Strings `ui.journey.visit_date.*`.

## Picture version of the symptom picker

`SymptomPicker` opens in the picture view for people who struggle with written text
(`SymptomBodyPicker`): a neutral body map (`BodyMap`) above big picture cards
(`ChoiceCard layout="tile"`, each with its listen button). Tapping a body part narrows the
cards to that part; with no part chosen every card shows, so nothing is ever hidden. "Show
as a list" switches to the text list (with card details); free text / voice sits below the
pictures. `symptomVisuals.ts` maps a symptom id to body parts and a Tabler picture
(presentation only, never sent); a card missing there falls under "Whole body". Silta does
not ask the person's sex: the figure is neutral and sex-specific cards stay visible to all.
Strings `ui.journey.body.*` in `backend/care_paths/seed/ui/body_map.yaml` (14 languages).
Tests `components/SymptomPictures.test.tsx`.
