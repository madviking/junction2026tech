Status: active
Last reviewed: 2026-11-14

# Phone line agent proof (2026-11-14)

Proof level: **provider simulation** against the **deployed** Silta API for the full care-path
conversations, and **one live phone call** for the number, keypad menu and language switch
(section at the end).

Setup is code: `scripts/phone_agent.py sync` creates or updates the ElevenLabs agent
"Silta phone line" (`gemini-2.5-flash` as its LLM, `eleven_v4_turbo` voice, language
detection across en + 10 Silta languages, voice recording off, transcripts kept 7 days) and
two webhook tools that call the deployed API:

| Tool | Endpoint |
| --- | --- |
| `compose_care_path` | `POST /api/care-paths/compose` `{lane, route, lang, barriers}` |
| `get_area_doors` | `GET /api/service-paths/areas/:area?route=` |

## Simulated call: Russian speaker, breast lump, Helsinki, shift work

ElevenLabs agent test (`POST /v1/convai/agent-testing/create`, type `simulation`, 10 turns),
run with `POST /v1/convai/agents/:id/run-tests`. Result: **passed**.

What the agent did, in order:

1. Answered in Russian, asked for the caller's entitlement (resident of Helsinki).
2. Called `compose_care_path` with `{"lang":"ru","lane":"U2","route":"A1","barriers":[]}`;
   the deployed API answered with Russian text (same-day needs assessment, 3-month legal
   limit for the first visit).
3. Told her to contact the health station, said the assessment should happen the same day,
   and said the interpreter is free.
4. When she said she cannot call 8–16, called `get_area_doors` for `helsinki`/`A1` and
   offered Omaolo (24/7) and 116117; when asked, said 116117 serves Finnish, Swedish and
   English only (from the door's `serviceLanguages`).
5. Read the Finnish script from `scriptFi`, added a request for a Russian interpreter, and
   translated it; suggested "patti rinnassa" for the symptom.
6. Ended the call with `end_call`. No diagnosis, no personal data asked.

Gap seen: the shift-work barrier (B2) came up after the first `compose_care_path` call and
was not passed in a second one; the agent covered it from the door data instead.

Cost of the run: 690 ElevenLabs credits (LLM $0.099 incl. the simulated user and the
evaluator, platform $0.027).

## Language menu: keypad or spoken

The greeting plays a keypad menu, each line in its own language (1 fi, 2 sv, 3 en, 4 ru,
5 uk, 6 ar, 7 so, 8 fa, 9 et, 0 → 1 vi / 2 zh), ending "or just say your language".
Keypad digits use ElevenLabs DTMF input (`conversation.dtmf_input_settings`, 1.5 s timeout,
`#` ends); the agent maps the digit and switches with the `language_detection` tool.

| Simulation | Agent behaviour | Result |
| --- | --- | --- |
| Caller presses 6, then speaks Arabic about a bowel-screening letter | `language_detection` → `ar`; `compose_care_path` `{lane U4, route A1, lang ar}` | passed (381 credits) |
| Caller says "Українською, будь ласка", temporary protection, blood in stool | `language_detection` → `uk`; `compose_care_path` `{lane U2, route A5, lang uk}` | passed (331 credits) |

Seen and fixed in the prompt after these runs (not re-run): a filler question before the
tool call, and gendered Arabic forms. Content gap seen: route A5 tells the caller to see the
reception-centre nurse, which does not fit a person with temporary protection who lives in
private housing; Vantaa is not one of the five seeded areas.

The number is a Twilio US number imported into ElevenLabs (native integration, Twilio voice
webhook points to ElevenLabs). A self-call from the number to itself is rejected by Twilio
as busy, so the phone path needs a call from an outside phone.

## First real call (14 Nov, from a Finnish mobile, noisy venue)

Proof level: **live phone call** (Twilio inbound → ElevenLabs native integration →
agent), conversation `conv_4901m7cyeasaeda8tgjz0zb4j8eq`, 28 s, 253 credits, Twilio $0.0085.

- The menu played; the caller pressed **1** at 9 s; the keypad digit arrived as a user turn
  and the agent switched to Finnish with `language_detection` (`fi`).
- Latency per turn: LLM first token 0.4–0.9 s, TTS first byte 0.07–0.09 s, audio started
  1.5–1.7 s after the caller stopped.
- Problem: the caller heard the sound cut. The log shows every agent turn `interrupted`:
  background speech in the venue and "Okay" / "Jep, kyllä tässä" counted as barge-in.
  Fix pushed (not yet re-tested on a call): `vad.background_voice_detection`,
  `turn_eagerness: patient`, a list of short acknowledgements in the menu languages as
  interruption ignore terms, and no `[happy]` voice tags.

Not yet proven: a full care-path conversation over the phone (needs the Twilio number), speech recognition and voice
quality on 8 kHz phone audio, Somali (expected weak), latency on a call.

## Full care-path call over the phone (14 Nov, 15:15)

Proof level: **live phone call**, conversation `conv_2001m7d35dngfm4a2h32nbwwnfdx`, 108 s,
829 credits, status `success`, ended by the caller (read back from the ElevenLabs
conversations API).

- The menu played; the caller pressed **3** and the agent continued in English.
- Caller: irregular bowel movements, no residence in Finland.
- The agent asked for the entitlement, called `compose_care_path` on the deployed API, and
  told the caller to book a non-urgent visit through the county necessary-care route or a
  volunteer clinic, with the right to a free interpreter.
- Follow-up "how much does it cost?" answered (volunteer clinics often free or low cost;
  ask about fees when booking).

This closes "a full care-path conversation over the phone" from the list above.

## Bulgarian fix (15 Nov)

A real call (`conv_1501m7e2v47qfa9b6btc91mgbykn`, 41 s) failed: the caller said "Български"
(heard as "Bulkers Umm al-Layl"), then "Болгарский", and the agent answered "I cannot speak
Bulgarian". Cause: `LANGS` in `scripts/phone_agent.py` lacked bg, th and yue, which the app
had gained, so the agent had no preset for them and fell back to English.

Fix, synced to the live agent (read back: presets now include `bg`, `th`, `yue`):
- `LANGS` + language presets: bg, th, yue; keypad 0 → 3 廣東話, 4 ไทย, 5 Български.
- Prompt: take a misheard or native-language name ("Bulkers", Български) as that language;
  never say it cannot speak an offered language.
- Greeting starts (fi + en): "Say the name of your language, or wait for the menu."
- `scripts/test_phone_agent.py` (offline) fails when an app language is missing on the phone.

Proof level: **provider simulation** (`test_4901m7e37dpnf8bab2b0zevqar4a`, run
`suite_3201m7e37e9rewb9t1qkcs8jzwh5`): caller says "Български." → `language_detection` `bg`
→ the whole conversation in Bulgarian → `compose_care_path` `{lane U2, route A1, lang bg}` on
the deployed API → `end_call`. **Passed**, 318 credits (LLM $0.041, platform $0.018).
Not yet proven: a real phone call in Bulgarian (speech recognition of the language name on
8 kHz audio is what failed before), Thai and Cantonese on the phone.
