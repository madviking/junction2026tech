import { IconChevronDown, type Icon } from '@tabler/icons-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Text } from '@/shared/ui/typography/Text'
import classes from './learn.module.css'

export type SceneTone = 'primary' | 'success' | 'warning' | 'neutral'

export interface LessonSceneProps {
  /** The main picture of the slide. */
  icon: Icon
  /** Up to three small pictures around it that tell the rest of the story. */
  accents?: Icon[]
  tone?: SceneTone
  /** Short caption inside the scene, for example "10 min". Optional. */
  badge?: ReactNode
}

/**
 * Picture for a learning slide: one big icon in a soft coloured panel with small accent
 * icons around it. Decorative (aria-hidden); the slide text carries the meaning.
 */
export function LessonScene({ icon: Main, accents = [], tone = 'primary', badge }: LessonSceneProps) {
  return (
    <div className={classes.scene} data-tone={tone} aria-hidden="true">
      <span className={classes.sceneHalo} />
      <span className={classes.sceneMain}>
        <Main size={84} stroke={1.5} />
      </span>
      {accents.slice(0, 3).map((Accent, index) => (
        <span key={index} className={classes.sceneAccent} data-slot={index}>
          <Accent size={28} stroke={1.75} />
        </span>
      ))}
      {badge && <span className={classes.sceneBadge}>{badge}</span>}
    </div>
  )
}

export interface LessonProgressProps {
  /** 1-based position. */
  value: number
  total: number
  /** Accessible text, for example "Part 2 of 5". Also shown as a caption. */
  label: string
}

/** Segmented progress for a short course: one segment per part. */
export function LessonProgress({ value, total, label }: LessonProgressProps) {
  return (
    <div className={classes.progress}>
      <div className={classes.progressTrack} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={value} aria-label={label}>
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={classes.progressSegment} data-state={index + 1 < value ? 'done' : index + 1 === value ? 'current' : 'todo'} />
        ))}
      </div>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </div>
  )
}

export interface FaqItemProps {
  question: ReactNode
  children: ReactNode
  /** Leading picture for the question. */
  icon?: ReactNode
}

/** One question that opens to its answer (native details/summary: keyboard and screen reader friendly). */
export function FaqItem({ question, icon, children }: FaqItemProps) {
  // Printing (or saving as PDF) shows the answer too; it folds back as it was afterwards.
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    let wasOpen = false
    const open = () => {
      if (!ref.current) return
      wasOpen = ref.current.open
      ref.current.open = true
    }
    const restore = () => {
      if (ref.current) ref.current.open = wasOpen
    }
    window.addEventListener('beforeprint', open)
    window.addEventListener('afterprint', restore)
    return () => {
      window.removeEventListener('beforeprint', open)
      window.removeEventListener('afterprint', restore)
    }
  }, [])
  return (
    <details ref={ref} className={classes.faq}>
      <summary className={classes.faqSummary}>
        {icon && <span className={classes.faqIcon}>{icon}</span>}
        <span className={classes.faqQuestion}>
          <Text variant="label" as="span">
            {question}
          </Text>
        </span>
        <IconChevronDown size={22} className={classes.faqChevron} aria-hidden="true" />
      </summary>
      <div className={classes.faqAnswer}>{children}</div>
    </details>
  )
}

export interface PhraseCardProps {
  /** The sentence in Finnish, to show or read to staff. */
  phrase: string
  /** What it means, in the person's language. */
  meaning: ReactNode
  /** Extra action, for example a play button. */
  action?: ReactNode
}

/** A Finnish sentence to show at the desk, big, with its meaning under it. */
export function PhraseCard({ phrase, meaning, action }: PhraseCardProps) {
  return (
    <div className={classes.phrase}>
      <div className={classes.phraseHead}>
        <div className={classes.phraseText} lang="fi" dir="ltr">
          <Text variant="title" as="p">
            {phrase}
          </Text>
        </div>
        {action}
      </div>
      <Text tone="muted">{meaning}</Text>
    </div>
  )
}

export interface ChecklistProps {
  items: { icon: ReactNode; text: ReactNode }[]
}

/** A short visual list: each line has its own picture. */
export function Checklist({ items }: ChecklistProps) {
  return (
    <ul className={classes.checklist}>
      {items.map((item, index) => (
        <li key={index} className={classes.checklistItem}>
          <span className={classes.checklistIcon} aria-hidden="true">
            {item.icon}
          </span>
          <Text as="span">{item.text}</Text>
        </li>
      ))}
    </ul>
  )
}

export interface TimelineStripProps {
  steps: { icon: ReactNode; label: ReactNode; detail?: ReactNode }[]
}

/** A horizontal "what happens when" strip (wraps on small screens). */
export function TimelineStrip({ steps }: TimelineStripProps) {
  return (
    <ol className={classes.timeline}>
      {steps.map((step, index) => (
        <li key={index} className={classes.timelineStep}>
          <span className={classes.timelineIcon} aria-hidden="true">
            {step.icon}
          </span>
          <Text variant="label" as="span">
            {step.label}
          </Text>
          {step.detail && (
            <Text variant="caption" tone="muted" as="span">
              {step.detail}
            </Text>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Wraps on-screen controls that should not appear on paper. */
export function PrintHidden({ children }: { children: ReactNode }) {
  return <div className={classes.printHidden}>{children}</div>
}

/** Shown only on paper (print, Save as PDF): wording for the printout, e.g. "show this card" instead of "this screen". */
export function PrintOnly({ children }: { children: ReactNode }) {
  return <div className={classes.printOnly}>{children}</div>
}

/** An icon that points "forward"/"back" in reading order: flipped in right-to-left languages. */
export function DirectionalIcon({ children }: { children: ReactNode }) {
  return (
    <span className={classes.mirror} aria-hidden="true">
      {children}
    </span>
  )
}
