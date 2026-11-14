import type { domain, service_paths } from '@/shared/api/client'

// Short names for the generated service-path types.
export type AreaSummary = service_paths.AreaSummary
export type AdminAreaView = service_paths.AdminAreaView
export type PointRow = service_paths.PointRow
export type StepRow = service_paths.StepRow
export type ScreeningRow = service_paths.ScreeningRow
export type MetricRow = service_paths.MetricRow
export type FindingRow = service_paths.FindingRow
export type SourceView = service_paths.SourceView
export type PointInput = service_paths.PointInput
export type StepInput = service_paths.StepInput
export type ScreeningInput = service_paths.ScreeningInput
export type MetricInput = service_paths.MetricInput
export type FindingInput = service_paths.FindingInput
export type SourceInput = service_paths.SourceInput
export type StatusRequest = service_paths.StatusRequest
export type CompareView = domain.CompareView
export type CompareMetricRow = domain.MetricRow
export type CompareStepRow = domain.StepRow
export type Stage = domain.Stage
export type StageCode = domain.StageCode
export type FactStatus = domain.FactStatus
export type PointKind = domain.PointKind
export type InformedBy = domain.InformedBy
export type SourceRef = domain.SourceRef
