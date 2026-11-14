// SQL for counties, county_figures and county_languages. Only regions reads them.
import { SQLDatabase } from 'encore.dev/storage/sqldb'

const db = SQLDatabase.named('silta')

export interface CountyFigure {
  label: string
  value: number
  unit: string
  year: number | null
  source: string
}

export interface CountyRow {
  id: string
  name: string
  figures: CountyFigure[]
  topLanguages: string[]
}

export async function findCounty(id: string): Promise<CountyRow | null> {
  const tx = await db.begin()
  try {
    const county = await tx.queryRow<{ id: string; name: string }>`SELECT id, name FROM counties WHERE id = ${id}`
    if (!county) {
      await tx.commit()
      return null
    }
    const figures = await tx.queryAll<{ label: string; value: string; unit: string; year: number | null; source: string }>`
      SELECT label, value, unit, year, source FROM county_figures WHERE county_id = ${id} ORDER BY sort, id`
    const langs = await tx.queryAll<{ language: string }>`
      SELECT language FROM county_languages WHERE county_id = ${id} ORDER BY rank`
    await tx.commit()
    return {
      id: county.id,
      name: county.name,
      figures: figures.map((f) => ({ ...f, value: Number(f.value) })),
      topLanguages: langs.map((l) => l.language),
    }
  } catch (err) {
    await tx.rollback()
    throw err
  }
}
