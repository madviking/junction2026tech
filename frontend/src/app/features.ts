// Frontend feature flags, read once at build time from Vite env (off unless set to 'true').

/** Journey editor at /admin/journey. Also needs SILTA_FEATURE_JOURNEY_EDITOR=true on the backend. */
export const JOURNEY_EDITOR: boolean = import.meta.env.VITE_FEATURE_JOURNEY_EDITOR === 'true'
