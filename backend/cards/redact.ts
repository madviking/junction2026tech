// Removes identifiers before text leaves the backend: visit codes (the anonymous
// code is never sent or stored), Finnish personal identity codes, e-mail
// addresses, phone numbers, long digit runs, self-introduced names and
// street addresses. Heuristic and conservative: symptom words must survive.
const REMOVED = '[removed]'

// A capitalised name word (Latin script with diacritics, hyphen or apostrophe).
const NAME = String.raw`\p{Lu}[\p{L}'’-]*`
const NAMES = String.raw`${NAME}(?:\s+${NAME}){0,2}`
// One to three words up to punctuation (scripts without capitals: Arabic; Somali).
const WORDS = String.raw`[^\s.,;:!?،؛؟]+(?:\s+[^\s.,;:!?،؛؟]+){0,2}`

const PATTERNS: RegExp[] = [
  // Visit code SLT-XXXX-XXXX, also typed with spaces or without dashes.
  /\bSLT[\s-]?[A-Z0-9]{4}[\s-]?[A-Z0-9]{4}\b/gi,
  // Henkilötunnus, e.g. 010190-123A.
  /\b\d{6}[-+A-FU-Y]\d{3}[0-9A-Y]\b/gi,
  /[^\s@]+@[^\s@]+\.[^\s@]+/g,

  // Self-introductions followed by capitalised name words (English, Finnish).
  new RegExp(String.raw`\b(?:[Mm]y\s+name\s+is|I\s+am\s+called|I'm\s+called|[Tt]his\s+is)\s+${NAMES}`, 'gu'),
  new RegExp(String.raw`\b(?:(?:[Mm]inun\s+)?[Nn]imeni\s+on|[Oo]len)\s+${NAMES}`, 'gu'),
  // Somali "magacaygu waa", Arabic "اسمي": the next one to three words.
  new RegExp(String.raw`\b[Mm]agacaygu\s+waa\s+${WORDS}`, 'gu'),
  new RegExp(String.raw`اسمي\s+${WORDS}`, 'gu'),

  // Street addresses: "Hämeentie 15 B 7", "Kauppakatu 3", "12 Baker Street".
  new RegExp(String.raw`\p{Lu}\p{L}*(?:katu|tie|kuja)\s+\d+(?:\s*[A-Za-z](?:\s*\d+)?)?\b`, 'gu'),
  new RegExp(String.raw`\b\d+\s+${NAME}\s+(?:Street|Road)\b`, 'gu'),

  // Phone numbers: optional +, digits with spaces, dots, dashes or brackets (8+ chars).
  /\+?\d[\d\s().-]{6,}\d/g,
  /\d{5,}/g,
]

export function stripIdentifiers(text: string): string {
  let out = text
  for (const re of PATTERNS) out = out.replace(re, REMOVED)
  return out.replace(/\s+/g, ' ').trim()
}

// True when nothing but removed identifiers and punctuation is left.
export function isEmptyAfterRedaction(text: string): boolean {
  return text.split(REMOVED).join('').replace(/[^\p{L}\p{N}]/gu, '') === ''
}
