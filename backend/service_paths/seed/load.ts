// Reads the service-path seed files from disk. The only file I/O in service_paths.
// Encore bundles code into .encore/build, so the directory is found from the working
// directory (encore run / encore test start in backend/).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseAreaSeed, parseMetricsSeed, type AreaSeed, type MetricsSeed } from '../domain/seed'

const CANDIDATES = [
  path.resolve(process.cwd(), 'service_paths/seed'),
  path.resolve(process.cwd(), 'backend/service_paths/seed'),
]

export function seedDir(): string {
  const dir = CANDIDATES.find((d) => existsSync(path.join(d, 'metrics.yaml')))
  if (!dir) throw new Error(`service_paths seed not found; looked in ${CANDIDATES.join(', ')}`)
  return dir
}

export interface ServicePathSeed {
  areas: AreaSeed[]
  metrics: MetricsSeed
  errors: string[]
}

export function loadSeed(dir = seedDir()): ServicePathSeed {
  const areaDir = path.join(dir, 'areas')
  const files = readdirSync(areaDir).filter((f) => f.endsWith('.yaml')).sort()
  const errors: string[] = []
  const areas = files.map((f) => {
    const { seed, errors: e } = parseAreaSeed(readFileSync(path.join(areaDir, f), 'utf8'), `areas/${f}`)
    errors.push(...e)
    if (seed.county && `${seed.county}.yaml` !== f) errors.push(`areas/${f}: county "${seed.county}" must match the file name`)
    return seed
  })
  const { seed: metrics, errors: me } = parseMetricsSeed(
    readFileSync(path.join(dir, 'metrics.yaml'), 'utf8'),
    'metrics.yaml',
    areas.map((a) => a.county),
  )
  errors.push(...me)
  return { areas, metrics, errors }
}
