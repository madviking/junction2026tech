# urgent

Urgent help for residents: the one red control in the header of every resident page.

- `UrgentHelp` (put it in `PageShell`'s `emergency` slot): a red **Urgent help** button
  (`EmergencyButton`) that opens a `FullScreenSheet` over the page with `UrgentContent`, the
  call link to 112 (`EmergencyCallLink`, `tel:112`) and **Cancel**.
- `UrgentContent`: "Call 112 now", "These signs need help right away:" and the emergency signs
  (`bundle.cards.emergencySigns`), every line with a listen button (`CardAudioButton`). The
  journey's `emergency` stage (reached through content) shows the same content.

Opening urgent help sends nothing to the server and is not a journey step: Cancel (or Escape)
returns to exactly where the person was, and the journey's "back" keeps following their own
steps. The emergency signs come from the loaded content, so the panel works offline.

Strings: `ui.urgent.*` in `backend/care_paths/seed/ui/urgent.yaml` (all languages);
`ui.journey.emergency.*`, `ui.journey.emergency_call` and `card.emergency.*` from the journey.

Test: `src/features/journey/JourneyPage.test.tsx` ("urgent help").
