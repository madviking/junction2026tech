import { api } from 'encore.dev/api'
import * as service from './service'

// Explains one photo of a letter in the resident's language. Nothing about the photo or
// the answer is kept.
export const explain = api(
  { expose: true, method: 'POST', path: '/api/letters/explain' },
  (req: service.ExplainRequest): Promise<service.LetterExplanation> => service.explain(req),
)
