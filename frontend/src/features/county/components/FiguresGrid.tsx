import type { CountyFigure } from '@/features/county/types'
import { useContent } from '@/shared/i18n'
import { Grid, StatTile } from '@/shared/ui'

export interface FiguresGridProps {
  figures: CountyFigure[]
}

/** Public figures as stat tiles: value with unit, year and source caption. */
export function FiguresGrid({ figures }: FiguresGridProps) {
  const { t, has, lang } = useContent()
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 })
  const unit = (u: string) => (has(`ui.county.unit.${u}`) ? t(`ui.county.unit.${u}`) : u)

  return (
    <Grid min="sm" gap="md">
      {figures.map((figure) => (
        <StatTile
          key={figure.label}
          label={figure.label}
          value={figure.unit === '%' ? `${number.format(figure.value)} %` : `${number.format(figure.value)} ${unit(figure.unit)}`}
          delta={figure.year === null ? t('ui.county.latest_year') : String(figure.year)}
          note={t('ui.county.source', { source: figure.source })}
        />
      ))}
    </Grid>
  )
}
