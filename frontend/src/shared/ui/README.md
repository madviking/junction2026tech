# shared/ui (design system)

Everything visual in Silta comes from here. Features and `src/app/` compose these
primitives and never style anything themselves; lint rule `local/no-raw-styles`
enforces it. The live gallery is `/design-system` (`src/features/design-system/`).

## Entry points

| Import | Contains | Ships in |
| --- | --- | --- |
| `@/shared/ui` | `UiProvider`, tokens, `Text`, layout, resident primitives, feedback, form fields | resident bundle |
| `@/shared/ui/admin` | `AdminShell`, `DataTable`, `Tabs`, `Toolbar`, `SideDrawer` | admin chunk only |
| `@/shared/ui/showcase` | token visualisations for the gallery | gallery chunk only |

Resident code must not import `@/shared/ui/admin` (it would pull Mantine's AppShell,
Table, Drawer and Tabs into the resident bundle).

## Tokens (`tokens.ts`)

One file holds every value; `theme.ts` turns it into the Mantine theme and into
`--silta-*` CSS variables (`--silta-color-*`, `--silta-tone-<tone>-{bg,fg,border,solid}`,
`--silta-space-*`, `--silta-radius-*`, `--silta-type-<variant>-{size,line-height,weight}`).

- Palettes (10 shades each): `primary` (calm petrol blue), `emergency` (red),
  `warning` (amber), `success` (green), `neutral` (also replaces Mantine `gray`).
  Filled backgrounds use shade 7 (white text ≥ 7:1).
- Semantic colours: `background`, `surface`, `surfaceHover`, `surfaceSelected`,
  `text`, `textMuted`, `textOnFilled`, `border` (controls, ≥ 3:1), `borderSubtle`
  (decorative), `primary`, `link`, `focus`, `emergency` (+ hover shades).
- Tones: `neutral`, `info`, `success`, `warning`, `danger`, shared by Banner,
  StatusBadge, StatTile and Text.
- Spacing `none xs sm md lg xl xxl`, radius `xs sm md lg xl full`, shadows `xs…xl`,
  breakpoints `xs sm(tablet) md(desktop) lg xl`, system font stack (no web fonts).
- Type scale, six styles only: `display`, `title`, `heading`, `body`, `label`,
  `caption`. Use `<Text variant>`; there is no free font size.
- Light colour scheme only (forced). Dark mode would add values in `theme.ts`'s
  `cssVariablesResolver` plus contrast pairs.

Contrast: `contrastPairs.ts` lists every foreground/background pair the primitives
render; `contrast.test.ts` checks each against WCAG 2.2 AA (text 4.5:1, large text
and UI components 3:1). Add a pair when a primitive uses a new combination.

## Primitives

Foundations
- `UiProvider` — MantineProvider + DirectionProvider; keeps `<html dir lang>` in sync with `dir`/`lang`.
- `Text` — all text; `variant` (six styles), `tone`, `as`, `eyebrow`.

Layout
- `Stack` / `Row` — vertical / horizontal flow; token `gap`, `align`, `justify`, `wrap`, `grow`.
- `Grid` — auto-fill tile grid (`min` tile width).
- `Container` — centered `narrow` (40rem) or `wide` (75rem) column with padding.
- `SurfaceCard` — white card; `padding` token, `tone`, `as`.
- `Section` — eyebrow, title (`level` 1–3), description, `aside`, children.
- `Divider` — line, optionally with a label. `IconText` — icon + text.
- `VisuallyHidden` — screen-reader-only text. `DirectionScope` — subtree in another `dir`/`lang`.
- `PageShell` — resident page: sticky header (title, back, header action), always-visible emergency slot, content, sticky bottom actions.

Resident actions
- `ActionButton` — the button: `primary | secondary | danger | subtle`, `fullWidth`, `loading`, `icon`, `href`, `compact` (admin only, 40px).
- `ChoiceCard` — big tappable choice; label (accessible name), detail (description), icon, trailing slot outside the button, `selected` → `aria-pressed`, `disabled`, `lang`.
- `AudioPlayButton` — 48px listen button: `idle | loading | playing | error`.
- `RecordButton` — 80px mic button: `idle | recording | processing | disabled`, elapsed `m:ss`.
- `EmergencyCallLink` — red `tel:` link for the emergency slot.

Feedback
- `Banner` — `info | warning | emergency | success`, title, text, optional action (`emergency` is solid red, `role="alert"`).
- `LoadingState`, `EmptyState` (title, description, icon, action), `ErrorState` (what failed, message, retry).
- `PlaceholderNotice` — "unchecked translation" style marker; text passed in.
- `StatusBadge` — `neutral | info | success | warning | danger` pill.

Data display
- `StepList` — ordered steps `done | current | upcoming` (+ localisable screen-reader status words).
- `StatTile` — label, value, optional delta (with tone) and note.

Forms (label, description, error on each)
- `TextField`, `TextAreaField`, `SelectField`, `PasswordField`, `FileField` (audio by default), `CheckboxField`.

Admin (`@/shared/ui/admin`)
- `AdminShell` — side navigation (router links, active state) collapsing to a top menu below 62em; header with user slot.
- `DataTable` — columns, rows, `rowKey`, empty state, keyboard-activatable `onRowClick`, toolbar slot, horizontal scroll under `minWidth`.
- `Toolbar` — filters at the start, actions at the end, wrapping.
- `Tabs` — controlled tabs (`items`, `value`, `onChange`, active content as children).
- `SideDrawer` — opens from the inline end; title, children, sticky footer actions.

## Rules every primitive follows

- Narrow typed props (`variant`, `tone`, token `gap`/`padding`); no pass-through of
  Mantine style props, `className` or `style`.
- Resident controls are at least 48×48px; admin controls at least 40px.
- Visible keyboard focus ring (`global.css`, 3px `--silta-color-focus`), never removed.
- Logical CSS only (`padding-inline`, `margin-block`, `inset-inline-start`); no
  left/right. Direction-sensitive icons get `.mirror`.
- Copy that users read is passed in as props (labels default to English only for
  accessible names such as "Close" or "Retry").

## Adding a primitive

1. Check the list above and Mantine first; extend an existing primitive with a new
   `variant`/`tone` before adding a component.
2. Create `<group>/<Name>.tsx` (plus the group's `*.module.css`). Style with
   `--silta-*` variables only; no hex values outside `tokens.ts`.
3. Export it from `index.ts` (or `admin.ts` if only admin uses it).
4. Add a behaviour test to `primitives.test.tsx` if it has interaction or ARIA logic,
   and any new colour pair to `contrastPairs.ts`.
5. Show every state on the `/design-system` page.

## Lint rule `local/no-raw-styles`

`eslint-rules/no-raw-styles.js`, level `error`, applies to every file under `src/`
except `src/shared/ui/` (features, app and tests included). It reports:

- imports from `@mantine/core` (`@mantine/hooks` is fine) and any `.css` import;
- a JSX `style` attribute;
- hex colours (`#abc`, `#aabbcc`, `#aabbccdd`) and `rgb()/rgba()/hsl()/hsla()` in
  strings and templates (`"Issue #123"` is allowed);
- raw style props on any element: `c bg fz fw ff lh ta tt td p px py pt pb ps pe m
  mx my mt mb ms me w h miw maw mih mah pos top left right bottom inset display
  opacity bd bdrs style styles classNames className fontSize color`.

Tests: `noRawStyles.lint.test.ts` lints snippets through the real `eslint.config.js`.

## `extra/`: primitives added by feature slices

Primitives a feature needed that the barrels do not export. Import them directly
(`@/shared/ui/extra/<Name>`); same rules as every primitive (tokens only, logical CSS,
narrow typed props). Promote one into the main barrel when a second feature needs it.

- `ColumnBoard`: horizontally scrolling columns with scroll-to and highlight, plus a side
  panel beside the board (above it below 62em). Used by the admin journey editor.
