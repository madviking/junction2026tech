import { vi } from 'vitest'
import type { LiveBundle } from '@/shared/api/types'

/** A minimal published bundle: only the texts a test reads. */
export function liveBundle(lang: string, texts: Record<string, string>): LiveBundle {
  return {
    version: 1,
    lang,
    dir: 'ltr',
    placeholder: false,
    languages: [
      { code: 'en', name: 'English', dir: 'ltr', placeholder: false, profile: 'C2' },
      { code: 'fi', name: 'Suomi', dir: 'ltr', placeholder: false, profile: 'C1' },
    ],
    texts: Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, { text, lang, fallback: false, review: 'checked' }])),
    lanes: [],
    routes: [],
  } as unknown as LiveBundle
}

export type Handler = (url: URL, init?: RequestInit) => Response | undefined

/** Stubs fetch at the network boundary; unknown URLs answer 404 like the backend. */
export function stubNetwork(handler: Handler) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://localhost')
    return handler(url, init) ?? Response.json({ code: 'not_found', message: 'not found' }, { status: 404 })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
