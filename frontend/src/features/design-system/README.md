# design-system (feature)

Living gallery of `src/shared/ui` at route `/design-system`. Not linked from the
resident or admin navigation; open it directly. Lazy-loaded in its own chunk.

- `DesignSystemPage.tsx`: composes the sections below.
- `sections/`: `TokensSection`, `ResidentPrimitivesSection`, `AdminPrimitivesSection`,
  `RtlSection`, plus shared `Specimen`, `ResidentFrame` and `noop`. Together they show: tokens (semantic colours, palettes with contrast ratios,
  every contrast pair with its WCAG verdict, type scale, spacing, radius, shadows),
  then every primitive in each state (selected, disabled, loading, error, playing,
  recording, empty), the admin primitives (table with filters, form fields, drawer,
  tabs) and an Arabic `dir="rtl"` sample including a full PageShell preview.
  AdminShell is shown live at `/admin`.
- `index.ts`: public entry (`DesignSystemPage`), used by `src/app/AppRoutes.tsx`.
- `DesignSystemPage.test.tsx`: renders the page, checks every specimen heading, that
  no contrast pair shows `FAIL`, the RTL scope, and table filtering to its empty state.
  Run: `npx vitest run src/features/design-system`.

When you add or change a primitive in `src/shared/ui`, add its states here.
Uses only `@/shared/ui`, `@/shared/ui/admin` and `@/shared/ui/showcase`.
