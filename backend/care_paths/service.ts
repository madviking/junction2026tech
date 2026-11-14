// Care-path endpoints' rules: read the live document from content, apply the domain.
import { APIError } from 'encore.dev/api'
import { content } from '~encore/clients'
import { compose, ComposeError, type CarePath } from './domain/compose'
import * as k from './domain/keys'
import { textOf } from './domain/texts'
import type { ContentDoc, Lang } from './domain/types'

export interface Option {
  code: string
  name: string
  summary: string
  detail: string
}

export interface CarePathOptions {
  lanes: Option[]
  routes: Option[]
  profiles: Option[]
  barriers: Option[]
}

export interface ComposeParams {
  lane: string
  route: string
  lang: string
  // Defaults to the language's profile from the content.
  profile?: string
  barriers?: string[]
}

// Live document from content, parsed once per release.
let cache: { releaseId: number; doc: ContentDoc } | null = null
async function liveDoc(): Promise<ContentDoc> {
  const live = await content.liveDoc()
  if (cache?.releaseId !== live.releaseId) cache = { releaseId: live.releaseId, doc: JSON.parse(live.docJson) as ContentDoc }
  return cache.doc
}

function langOf(doc: ContentDoc, lang: string): Lang {
  const def = doc.languages.find((l) => l.code === lang)
  if (!def) throw APIError.invalidArgument(`unknown language ${lang}`)
  return def.code
}

export async function listOptions(lang: string): Promise<CarePathOptions> {
  const doc = await liveDoc()
  const l = langOf(doc, lang)
  const t = (key: string) => textOf(doc, key, l)
  const s = doc.structure
  return {
    lanes: Object.keys(s.lanes).map((c) => ({ code: c, name: t(k.laneKey(c, 'name')), summary: t(k.laneKey(c, 'trigger')), detail: t(k.laneKey(c, 'tone')) })),
    routes: Object.keys(s.routes).map((c) => ({ code: c, name: t(k.routeKey(c, 'name')), summary: t(k.routeKey(c, 'who')), detail: t(k.routeKey(c, 'note')) })),
    profiles: Object.keys(s.profiles).map((c) => ({ code: c, name: t(k.profileKey(c, 'name')), summary: t(k.profileKey(c, 'who')), detail: t(k.profileKey(c, 'mode')) })),
    barriers: Object.keys(s.barriers).map((c) => ({ code: c, name: t(k.barrierKey(c, 'name')), summary: t(k.barrierKey(c, 'looks')), detail: t(k.barrierKey(c, 'fix')) })),
  }
}

export async function composePath(p: ComposeParams): Promise<CarePath> {
  const doc = await liveDoc()
  const lang = langOf(doc, p.lang)
  const profile = p.profile ?? doc.languages.find((l) => l.code === lang)!.profile
  try {
    return compose(doc, { lane: p.lane, route: p.route, profile, barriers: p.barriers ?? [], lang })
  } catch (err) {
    if (err instanceof ComposeError) throw APIError.invalidArgument(err.message)
    throw err
  }
}
