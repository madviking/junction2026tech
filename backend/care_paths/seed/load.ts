// Reads the seed files from disk. The only I/O in care_paths.
// Encore bundles code into .encore/build, so the directory is found from the
// working directory (encore run / encore test start in backend/).
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { buildSeedDoc, type SeedFiles } from '../domain/seed'
import type { ContentDoc } from '../domain/types'
import { LANGS } from '../domain/types'

const CANDIDATES = [
  path.resolve(process.cwd(), 'care_paths/seed'),
  path.resolve(process.cwd(), 'backend/care_paths/seed'),
]

export function seedDir(): string {
  const dir = CANDIDATES.find((d) => existsSync(path.join(d, 'rules.yaml')))
  if (!dir) throw new Error(`care_paths seed not found; looked in ${CANDIDATES.join(', ')}`)
  return dir
}

export function readSeedFiles(dir = seedDir()): SeedFiles {
  const read = (name: string) => readFileSync(path.join(dir, name), 'utf8')
  const uiDir = path.join(dir, 'ui')
  const uiYamls = existsSync(uiDir)
    ? readdirSync(uiDir)
        .filter((f) => f.endsWith('.yaml'))
        .sort()
        .map((f) => readFileSync(path.join(uiDir, f), 'utf8'))
    : []
  const translations: SeedFiles['translations'] = {}
  for (const lang of LANGS) {
    const file = path.join(dir, `texts.${lang}.yaml`)
    if (existsSync(file)) translations[lang] = readFileSync(file, 'utf8')
  }
  return { rulesYaml: read('rules.yaml'), cardsYaml: read('cards.yaml'), uiYamls, translations }
}

export function loadSeedDoc(dir?: string): ContentDoc {
  return buildSeedDoc(readSeedFiles(dir))
}
