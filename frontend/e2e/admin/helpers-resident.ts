import { expect, type APIRequestContext } from '@playwright/test'

/** A synthetic anonymous visit for resident checks; delete it with `deleteVisit`. */
export async function createVisit(request: APIRequestContext, lang = 'en'): Promise<string> {
  const response = await request.post('/api/visits', { data: { lang } })
  expect(response.ok()).toBeTruthy()
  return ((await response.json()) as { code: string }).code
}

/** Moves a visit to the contact stage: a lump symptom, then "not sure" of the door. */
export async function advanceToContact(request: APIRequestContext, code: string, lang = 'en') {
  for (const data of [{ lang, outcome: 'symptom', symptoms: ['lump'] }, { lang, outcome: 'not_sure' }]) {
    const response = await request.post(`/api/visits/${code}/events`, { data })
    expect(response.ok()).toBeTruthy()
  }
}

export async function deleteVisit(request: APIRequestContext, code: string) {
  await request.delete(`/api/visits/${code}`)
}

/** The published text of a key (no fallback check). */
export async function liveText(request: APIRequestContext, key: string, lang = 'en'): Promise<string | undefined> {
  const response = await request.get(`/api/content/live?lang=${lang}`)
  expect(response.ok()).toBeTruthy()
  const bundle = (await response.json()) as { texts: Record<string, { text: string }> }
  return bundle.texts[key]?.text
}
