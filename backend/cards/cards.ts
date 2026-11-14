import { api } from 'encore.dev/api'
import * as service from './service'

// Public: match what a resident typed or said to a card from the live content.
export const match = api(
  { expose: true, method: 'POST', path: '/api/cards/match' },
  (req: service.MatchRequest): Promise<service.MatchResponse> => service.match(req),
)
