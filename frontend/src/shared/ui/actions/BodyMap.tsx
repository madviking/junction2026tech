import { useId } from 'react'
import { Text } from '@/shared/ui/typography/Text'
import classes from './bodyMap.module.css'

export type BodyRegionId = 'head' | 'chest' | 'belly' | 'skin' | 'whole'

export interface BodyMapRegion {
  id: BodyRegionId
  /** Visible text of the region's button; also its accessible name. */
  label: string
}

export interface BodyMapProps {
  /** Group name shown above the figure, e.g. "Where do you feel it?". */
  label: string
  /** The regions that can be chosen, in button order. Parts of other regions stay grey and inert. */
  regions: BodyMapRegion[]
  /** The chosen region, or null for none. */
  value: BodyRegionId | null
  /** Tapping the chosen region again clears it (null). */
  onChange: (region: BodyRegionId | null) => void
  disabled?: boolean
}

type PartRegion = Exclude<BodyRegionId, 'whole'>

/** A neutral (sexless) front figure, viewBox 0 0 120 250. Symmetric, so it needs no mirroring in RTL. */
const PARTS: Array<{ id: string; region: PartRegion; d: string }> = [
  { id: 'head', region: 'head', d: 'M60 7a17 17 0 1 1 0 34a17 17 0 1 1 0-34Z' },
  { id: 'neck', region: 'head', d: 'M53 39h14v13h-14Z' },
  { id: 'chest', region: 'chest', d: 'M36 52Q60 46 84 52Q90 54 90 62L86 108L34 108L30 62Q30 54 36 52Z' },
  { id: 'belly', region: 'belly', d: 'M34 108L86 108L88 148Q60 157 32 148Z' },
  { id: 'arm-start', region: 'skin', d: 'M29 57Q21 60 19 70L13 140Q13 148 19 148Q25 148 25 141L32 86Z' },
  { id: 'arm-end', region: 'skin', d: 'M91 57Q99 60 101 70L107 140Q107 148 101 148Q95 148 95 141L88 86Z' },
  { id: 'leg-start', region: 'skin', d: 'M34 151Q46 157 58 155L56 240Q56 246 49 246L43 246Q38 246 38 240Z' },
  { id: 'leg-end', region: 'skin', d: 'M86 151Q74 157 62 155L64 240Q64 246 71 246L77 246Q82 246 82 240Z' },
]

/** Small spots on the limbs that show "skin". */
const SPOTS: Array<[number, number]> = [
  [19, 118],
  [100, 100],
  [47, 205],
]

/**
 * Tappable body figure plus one toggle button per region. The buttons are the keyboard and
 * screen-reader controls; the figure is a pointer shortcut and the visual feedback.
 */
export function BodyMap({ label, regions, value, onChange, disabled }: BodyMapProps) {
  const labelId = useId()
  const available = new Set(regions.map((r) => r.id))
  const toggle = (region: BodyRegionId) => {
    if (!disabled) onChange(value === region ? null : region)
  }
  const isActive = (region: PartRegion) => value === region || value === 'whole'

  return (
    <div className={classes.root} role="group" aria-labelledby={labelId}>
      <span id={labelId}>
        <Text variant="label">{label}</Text>
      </span>
      <div className={classes.layout}>
        <svg className={classes.figure} viewBox="0 0 120 250" aria-hidden="true" focusable="false">
          {PARTS.map((part) => {
            const canTap = !disabled && available.has(part.region)
            return (
              <path
                key={part.id}
                d={part.d}
                className={classes.part}
                data-available={available.has(part.region) || undefined}
                data-active={isActive(part.region) || undefined}
                onClick={canTap ? () => toggle(part.region) : undefined}
              />
            )
          })}
          {SPOTS.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.2} className={classes.spot} data-active={isActive('skin') || undefined} />
          ))}
        </svg>
        <div className={classes.buttons}>
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              className={classes.regionButton}
              aria-pressed={value === region.id}
              disabled={disabled}
              onClick={() => toggle(region.id)}
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
