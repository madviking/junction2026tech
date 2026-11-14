Status: active
Last reviewed: 2026-11-14

# Phone line agent proof (2026-11-14)

Proof level: **provider simulation** against the **deployed** Silta API. A Twilio number is
attached, but no outside call has been made yet, and no spoken audio was involved: ElevenLabs
ran text simulations of callers.

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

Not yet proven: a real phone call (needs the Twilio number), speech recognition and voice
quality on 8 kHz phone audio, Somali (expected weak), latency on a call.
