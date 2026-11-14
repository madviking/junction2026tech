import type { visits } from '@/shared/api/client'

// Feature-local alias of the generated contract type.
export type ClinicianSummary = visits.ClinicianSummary
export type ClinicianAnswerCard = visits.ClinicianSummary['answerCards'][number]
