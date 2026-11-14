/**
 * Public API of the design system for resident and shared UI. Features and `src/app/`
 * import from here (`@/shared/ui`). Admin-only primitives live in `@/shared/ui/admin` and
 * the token gallery in `@/shared/ui/showcase`, so neither ships in the resident bundle.
 * Lint rule `local/no-raw-styles` blocks Mantine and raw styles outside src/shared/ui.
 */

// Foundations
export { DocumentLanguage, UiProvider, type TextDirection, type UiProviderProps } from '@/shared/ui/UiProvider'
export {
  breakpoints,
  palettes,
  radius,
  semanticColors,
  shadows,
  spacing,
  tones,
  typeScale,
  TOUCH_TARGET_PX,
  type SpaceToken,
  type TextVariant,
  type Tone,
} from '@/shared/ui/tokens'
export { AA, contrastRatio } from '@/shared/ui/contrast'
export { contrastPairs, type ContrastPair } from '@/shared/ui/contrastPairs'
export { Text, type TextProps, type TextTone } from '@/shared/ui/typography/Text'

// Layout
export {
  Container,
  DirectionScope,
  Divider,
  Grid,
  IconText,
  Row,
  Section,
  Stack,
  SurfaceCard,
  VisuallyHidden,
  type ContainerProps,
  type GridProps,
  type RowProps,
  type SectionProps,
  type StackProps,
  type SurfaceCardProps,
} from '@/shared/ui/layout/Layout'
export { PageActions, PageProgress, PageShell, type PageProgressProps, type PageShellProps } from '@/shared/ui/layout/PageShell'

// Actions
export { ActionButton, type ActionButtonProps, type ActionButtonVariant } from '@/shared/ui/actions/ActionButton'
export { ChoiceCard, type ChoiceCardProps } from '@/shared/ui/actions/ChoiceCard'
export { BodyMap, type BodyMapProps, type BodyMapRegion, type BodyRegionId } from '@/shared/ui/actions/BodyMap'
export { AudioPlayButton, type AudioPlayButtonProps, type AudioPlayState } from '@/shared/ui/actions/AudioPlayButton'
export { PhotoButton, type PhotoButtonProps } from '@/shared/ui/actions/PhotoButton'
export { RecordButton, type RecordButtonProps, type RecordState } from '@/shared/ui/actions/RecordButton'
export { formatElapsed } from '@/shared/ui/actions/formatElapsed'
export { EmergencyCallLink, type EmergencyCallLinkProps } from '@/shared/ui/actions/EmergencyCallLink'

// Feedback
export {
  Banner,
  EmptyState,
  ErrorState,
  FloatingNotice,
  HighlightBox,
  LoadingState,
  PlaceholderNotice,
  ReadingMark,
  StatusBadge,
  type BannerProps,
  type BannerTone,
  type EmptyStateProps,
  type ErrorStateProps,
  type FloatingNoticeProps,
  type HighlightBoxProps,
  type ReadingMarkProps,
  type StatusBadgeProps,
} from '@/shared/ui/feedback/Feedback'

// Data display
export { StepList, type StepItem, type StepListProps, type StepStatus } from '@/shared/ui/data/StepList'
export { StatTile, type StatTileProps } from '@/shared/ui/data/StatTile'

// Forms
export {
  CheckboxField,
  FileField,
  PasswordField,
  SelectField,
  TextAreaField,
  TextField,
  type SelectOption,
} from '@/shared/ui/forms/FormFields'


// Learning (short visual courses) and documents (example letters)
export {
  Checklist,
  DirectionalIcon,
  FaqItem,
  LessonProgress,
  LessonScene,
  PhraseCard,
  PrintHidden,
  PrintOnly,
  TimelineStrip,
  type ChecklistProps,
  type FaqItemProps,
  type LessonProgressProps,
  type LessonSceneProps,
  type PhraseCardProps,
  type SceneTone,
  type TimelineStripProps,
} from '@/shared/ui/learn/Learn'
export {
  LetterBullets,
  LetterFacts,
  LetterQrBlock,
  LetterSection,
  LetterSheet,
  type LetterFactsProps,
  type LetterQrBlockProps,
  type LetterSectionProps,
  type LetterSheetProps,
} from '@/shared/ui/document/LetterSheet'
