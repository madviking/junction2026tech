/** Select value meaning "an id that is not a stage yet". */
export const OTHER_STAGE = '__other__'

export interface NextStageValue {
  choice: string | null
  other: string
}

/** The stage id the value names ('' when nothing is chosen). */
export const nextStageId = (value: NextStageValue) => (value.choice === OTHER_STAGE ? value.other.trim() : (value.choice ?? ''))

const STAGE_PATH = /^journey\.stages\.([a-z][a-z0-9_]*)/

/** The stage a validation issue path points into, if any. */
export const issueStage = (path: string): string | null => STAGE_PATH.exec(path)?.[1] ?? null
