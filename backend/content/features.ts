// Feature flags of the content service. Off unless the environment turns them on, so an
// unfinished feature is unreachable by default.

// Journey editor (admin_journey_api.ts): `SILTA_FEATURE_JOURNEY_EDITOR=true` turns it on.
export const JOURNEY_EDITOR_ENABLED = process.env.SILTA_FEATURE_JOURNEY_EDITOR === 'true'
