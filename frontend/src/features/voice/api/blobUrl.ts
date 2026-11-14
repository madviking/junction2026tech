// Clip URLs from the backend are relative to the API origin (`/api/voice/blob/:id`).
// Same base as the `api` instance in @/shared/api/api: VITE_API_URL when the API lives on
// another origin, otherwise the page origin (the Vite proxy forwards /api in development).
const apiBase = (): string => import.meta.env.VITE_API_URL ?? globalThis.location?.origin ?? ''

/** Absolute URL for a clip's audio bytes. */
export function blobUrl(relative: string): string {
  const base = apiBase()
  return base ? new URL(relative, base).toString() : relative
}
