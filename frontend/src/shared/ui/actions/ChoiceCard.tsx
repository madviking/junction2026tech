import { IconCircleCheckFilled } from '@tabler/icons-react'
import { useId, type ReactNode } from 'react'
import { Text } from '@/shared/ui/typography/Text'
import classes from './actions.module.css'

export interface ChoiceCardProps {
  /** Main text; this is the button's accessible name. */
  label: ReactNode
  /** Secondary line; announced as the description. */
  detail?: ReactNode
  /** Leading icon or flag. */
  icon?: ReactNode
  /** A separate control at the inline end, for example an AudioPlayButton. Never nested inside the button. */
  trailing?: ReactNode
  /** `true`/`false` makes this a toggle (`aria-pressed`); leave undefined for a plain action card. */
  selected?: boolean
  disabled?: boolean
  /** Language of the label when it differs from the page (for example a language name in its own script). */
  lang?: string
  /** `row` (default): icon, texts and check in one line. `tile`: big picture on top, text under it, for picture grids. */
  layout?: 'row' | 'tile'
  onPress?: () => void
}

/** Big tappable card for choosing one thing (language, symptom, answer). */
export function ChoiceCard({ label, detail, icon, trailing, selected, disabled, lang, layout = 'row', onPress }: ChoiceCardProps) {
  const labelId = useId()
  const detailId = useId()
  return (
    <div className={classes.choice} data-layout={layout} data-selected={selected || undefined} data-disabled={disabled || undefined}>
      <button
        type="button"
        className={classes.choiceMain}
        aria-pressed={selected}
        aria-labelledby={labelId}
        aria-describedby={detail ? detailId : undefined}
        disabled={disabled}
        onClick={onPress}
      >
        {icon && (
          <span className={classes.choiceIcon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={classes.choiceTexts}>
          <span id={labelId} lang={lang}>
            <Text as="span" variant="label">
              {label}
            </Text>
          </span>
          {detail && (
            <span id={detailId}>
              <Text as="span" variant="caption" tone="muted">
                {detail}
              </Text>
            </span>
          )}
        </span>
        {selected && (
          <span className={classes.choiceCheck} aria-hidden="true">
            <IconCircleCheckFilled size={24} />
          </span>
        )}
      </button>
      {trailing && <div className={classes.choiceTrailing}>{trailing}</div>}
    </div>
  )
}
