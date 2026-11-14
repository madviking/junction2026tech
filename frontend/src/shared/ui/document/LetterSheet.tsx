import type { ReactNode } from 'react'
import { Text } from '@/shared/ui/typography/Text'
import classes from './letter.module.css'

export interface LetterSheetProps {
  /** Diagonal-free corner stamp, for example "EXAMPLE". */
  stamp?: ReactNode
  /** Letterhead: sender block on the start side. */
  sender: ReactNode
  /** Letterhead: date, reference and page on the end side. */
  meta?: ReactNode
  /** Window-envelope address block. */
  recipient: ReactNode
  /** Letter language: sets `lang`/`dir` for the sheet only. */
  lang: string
  dir: 'ltr' | 'rtl'
  children: ReactNode
}

/** A paper letter (A4 proportions on wide screens, full width on phones, clean on print). */
export function LetterSheet({ stamp, sender, meta, recipient, lang, dir, children }: LetterSheetProps) {
  return (
    <article className={classes.sheet} lang={lang} dir={dir}>
      {stamp && <span className={classes.stamp}>{stamp}</span>}
      <header className={classes.head}>
        <div className={classes.sender}>{sender}</div>
        {meta && <div className={classes.meta}>{meta}</div>}
      </header>
      <div className={classes.recipient}>{recipient}</div>
      <div className={classes.body}>{children}</div>
    </article>
  )
}

export interface LetterFactsProps {
  title: ReactNode
  rows: { label: ReactNode; value: ReactNode }[]
}

/** The boxed "your appointment" block of a letter. */
export function LetterFacts({ title, rows }: LetterFactsProps) {
  return (
    <section className={classes.facts}>
      <Text variant="label" as="h3">
        {title}
      </Text>
      <dl className={classes.factList}>
        {rows.map((row, index) => (
          <div key={index} className={classes.factRow}>
            <dt>
              <Text variant="caption" tone="muted" as="span">
                {row.label}
              </Text>
            </dt>
            <dd>
              <Text variant="label" as="span">
                {row.value}
              </Text>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export interface LetterSectionProps {
  title: ReactNode
  children: ReactNode
}

/** One headed paragraph group of a letter. */
export function LetterSection({ title, children }: LetterSectionProps) {
  return (
    <section className={classes.section}>
      <Text variant="label" as="h3">
        {title}
      </Text>
      {children}
    </section>
  )
}

export interface LetterBulletsProps {
  items: ReactNode[]
}

export function LetterBullets({ items }: LetterBulletsProps) {
  return (
    <ul className={classes.bullets}>
      {items.map((item, index) => (
        <li key={index}>
          <Text as="span">{item}</Text>
        </li>
      ))}
    </ul>
  )
}

export interface LetterQrBlockProps {
  /** Image URL of the QR code (an SVG in /public). */
  qrSrc: string
  qrAlt: string
  title: ReactNode
  body: ReactNode
  /** The address a person can type. */
  link: string
}

/** The Silta strip at the foot of a screening letter: QR code + "we explain this in your language". */
export function LetterQrBlock({ qrSrc, qrAlt, title, body, link }: LetterQrBlockProps) {
  return (
    <aside className={classes.qr}>
      <img className={classes.qrImage} src={qrSrc} alt={qrAlt} width={112} height={112} />
      <div className={classes.qrText}>
        <Text variant="label" as="p">
          {title}
        </Text>
        <Text variant="caption" as="p">
          {body}
        </Text>
        <span className={classes.qrLink} dir="ltr">
          {link}
        </span>
      </div>
    </aside>
  )
}
