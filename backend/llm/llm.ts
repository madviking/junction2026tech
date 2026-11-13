import { api } from 'encore.dev/api'
import * as service from './service'

// Internal only: other services call this through ~encore/clients, never Gemini directly.
export const complete = api(
  { expose: false, method: 'POST', path: '/llm/complete' },
  (req: service.CompleteRequest): Promise<service.CompleteResponse> => service.complete(req),
)
