import { api } from 'encore.dev/api'
import * as service from './service'

// Public: the live (published) content in one language, for resident screens.
export const live = api(
  { expose: true, method: 'GET', path: '/api/content/live' },
  (req: { lang: string }): Promise<service.LiveBundle> => service.getLiveBundle(req.lang),
)

// Internal: the whole live document, for services that apply its rules (care_paths, visits, cards, voice).
export const liveDoc = api(
  { expose: false, method: 'GET', path: '/internal/content/live-doc' },
  (): Promise<service.LiveDocJson> => service.getLiveDocJson(),
)
