#!/usr/bin/env python3
"""Silta phone line: an ElevenLabs agent that answers a real phone number.

The agent talks with the caller in their language and uses two live Silta API
endpoints as tools: compose a care path and look up the concrete doors in an area.
Idempotent: tools and the agent are matched by name and updated in place.

Run:
  python3 scripts/phone_agent.py sync                 # create/update tools + agent
  python3 scripts/phone_agent.py import-number +1...  # attach a Twilio number (needs TWILIO_SID/TWILIO_TOKEN)
  python3 scripts/phone_agent.py show                 # agent id, tools, numbers

Reads ELEVEN_LABS_API_KEY (and Twilio keys) from .env; never prints them.
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EL = "https://api.elevenlabs.io/v1/convai"
SILTA_API = "https://easily-smart-aphid.eur-1.aiven.app"
AGENT_NAME = "Silta phone line"
LLM = "gemini-2.5-flash"
# Languages the care-path content serves (GET /api/care-paths/options?lang=..) and the
# agent can speak. Somali is served as text but its phone voice is weak; see README.
LANGS = ["fi", "sv", "ru", "uk", "ar", "et", "fa", "vi", "zh", "so"]
AREAS = ["helsinki", "lansi-uusimaa", "kymenlaakso", "etela-pohjanmaa", "pohjois-pohjanmaa"]

# Keypad language menu: digit -> (language code, menu line spoken in that language).
# The caller can also just speak; the agent switches by language detection.
MENU = {
    "1": ("fi", "Suomeksi, paina 1."),
    "2": ("sv", "På svenska, tryck 2."),
    "3": ("en", "In English, press 3."),
    "4": ("ru", "По-русски нажмите 4."),
    "5": ("uk", "Українською натисніть 5."),
    "6": ("ar", "للعربية اضغط 6."),
    "7": ("so", "Soomaali, riix 7."),
    "8": ("fa", "برای فارسی، ۸ را بزنید."),
    "9": ("et", "Eesti keeles vajuta 9."),
}
MORE = {"1": ("vi", "Tiếng Việt"), "2": ("zh", "中文")}

FIRST_MESSAGE = (
    "Hei, tämä on Silta. Hello, this is Silta. "
    + " ".join(line for _, line in MENU.values())
    + " Other languages, press 0, or just say your language."
)

_MENU_RULES = "\n".join(f"   {d} -> {code}" for d, (code, _) in MENU.items())
_MORE_RULES = ", ".join(f"{d} -> {code} ({name})" for d, (code, name) in MORE.items())

PROMPT = f"""You are Silta, a calm phone guide for people in Finland who do not speak Finnish well
and are worried about a possible cancer symptom or about cancer screening.
You are not a doctor. You never diagnose, never name a disease, never estimate risk.
Your job: get the caller to the right door in the Finnish health system, with the right
words in Finnish, and their rights (free interpreter, time limits).

0. Language first. The greeting played a keypad menu. Keypad presses arrive as a user turn
   that contains only digits. Map the first digit:
{_MENU_RULES}
   0 -> say in English: "Press 1 for Tiếng Việt, 2 for 中文, or say your language." Then map
   the next digit: {_MORE_RULES}.
   If the caller instead names a language or simply speaks one, use that language.
   Switch with the language detection tool to the chosen language (stay on English for en),
   then say in that language: "This is Silta. I help you find the right place for care.
   What is happening?" If the caller's language is not offered, continue in English slowly.

Speak the caller's language. If they change language later, switch again with the language
detection tool. Short sentences. One question at a time. Warm, serious, not frightening.
Do not assume the caller's gender; use neutral forms where the language allows.
As soon as you know the situation and the route, call compose_care_path. No filler questions
such as "anything else?" before it.

1. Safety first. If the caller describes heavy bleeding, severe breathlessness, chest pain,
   sudden weakness or confusion: tell them to hang up and call 112 now. Repeat 112 slowly.
2. Understand the situation and pick a lane code (do not say codes aloud):
   U1 same day (new severe pain, vomiting blood, high fever during cancer treatment),
   U2 alarm symptom (lump, unexplained bleeding, blood in stool, cough over 3 weeks with
   weight loss, bleeding after menopause, a changing mole),
   U3 persistent unclear (tiredness, vague pain, appetite loss for weeks),
   U4 screening (invitation letter, missed screening, positive result),
   U5 stalled (referral sent and no letter, missing result, late treatment start).
3. Ask which kind of care they are entitled to and pick a route code:
   A1 resident with a home municipality (default), A2 occupational health through work,
   A3 higher-education student, A4 private/insurance, A5 Ukrainian with temporary protection,
   A6 asylum seeker in reception, A7 no residence permit, A8 EU/Nordic without home municipality.
4. Ask where they live. Supported areas: {", ".join(AREAS)}.
5. Listen for barriers and pass their codes if heard: B1 cost, B2 cannot call 8-16,
   B3 distance, B4 distrust, B5 stigma, B6 wants a female doctor, B7 family interprets,
   B8 status fear, B9 care duties, B10 anxiety.
6. Call compose_care_path with lane, route, lang and barriers. lang is one of:
   en, {", ".join(LANGS)} (use en for any other language).
   Tell them the door, the time limit that protects them, and their adaptations.
   Then offer to say the Finnish sentence (scriptFi) slowly so they can repeat it on the
   phone, and explain it in their language (scriptLocal).
7. If they want a phone number, opening hours or the nearest place, call get_area_doors
   with their area and route and read only the one or two most relevant doors.
8. Close: remind them they can ask for a free interpreter, and to call again if nothing
   happens. Then end the call.

Privacy: never ask for a name, personal identity code, address, or phone number.
If the caller gives them, do not repeat them.
If a tool fails, say you cannot look it up right now and give the general advice:
contact your health station and ask for an assessment, and ask for an interpreter.
"""

COMPOSE_TOOL = {
    "type": "webhook",
    "name": "compose_care_path",
    "description": (
        "Compose the caller's care path from Silta: the door to contact, a Finnish phone "
        "script with its translation, legal time limits, steps and adaptations."
    ),
    "response_timeout_secs": 10,
    "api_schema": {
        "url": f"{SILTA_API}/api/care-paths/compose",
        "method": "POST",
        "request_body_schema": {
            "type": "object",
            "description": "Care-path codes chosen from the conversation",
            "properties": {
                "lane": {"type": "string", "description": "Lane code U0-U5 (urgency of the situation)"},
                "route": {"type": "string", "description": "Route code A1-A8 (entitlement to care); A1 if unsure"},
                "lang": {"type": "string", "description": f"Caller language: en or one of {', '.join(LANGS)}"},
                "barriers": {
                    "type": "array",
                    "description": "Barrier codes B1-B10 heard in the conversation; empty if none",
                    "items": {"type": "string", "description": "One barrier code such as B2"},
                },
            },
            "required": ["lane", "route", "lang"],
        },
    },
}

DOORS_TOOL = {
    "type": "webhook",
    "name": "get_area_doors",
    "description": (
        "Concrete doors in one wellbeing area for a route: health stations, phone services, "
        "after-hours and emergency numbers, opening hours, interpreter instructions, screening."
    ),
    "response_timeout_secs": 10,
    "api_schema": {
        "url": f"{SILTA_API}/api/service-paths/areas/{{area}}",
        "method": "GET",
        "path_params_schema": {
            "area": {"type": "string", "description": f"Area id: one of {', '.join(AREAS)}"},
        },
        "query_params_schema": {
            "properties": {"route": {"type": "string", "description": "Route code A1-A8"}},
            "required": ["route"],
        },
    },
}


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if m and m.group(2).strip().strip("'\""):
            env[m.group(1)] = m.group(2).strip().strip("'\"")
    return env


ENV = load_env()
# python.org builds on macOS ship without a CA bundle; fall back to the system one.
_SYSTEM_CA = Path("/etc/ssl/cert.pem")
TLS = ssl.create_default_context(cafile=str(_SYSTEM_CA) if _SYSTEM_CA.exists() else None)


def el(method: str, path: str, body: dict | None = None) -> dict:
    req = urllib.request.Request(
        f"{EL}{path}",
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": ENV["ELEVEN_LABS_API_KEY"], "content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=TLS) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        sys.exit(f"ElevenLabs {method} {path} -> {err.code}: {err.read().decode()[:800]}")


def upsert_tool(config: dict) -> str:
    existing = {t["tool_config"]["name"]: t["id"] for t in el("GET", "/tools").get("tools", [])}
    if config["name"] in existing:
        el("PATCH", f"/tools/{existing[config['name']]}", {"tool_config": config})
        return existing[config["name"]]
    return el("POST", "/tools", {"tool_config": config})["id"]


def agent_body(tool_ids: list[str]) -> dict:
    return {
        "name": AGENT_NAME,
        "tags": ["silta", "junction2026"],
        "conversation_config": {
            "agent": {
                "first_message": FIRST_MESSAGE,
                "language": "en",
                "prompt": {
                    "prompt": PROMPT,
                    "llm": LLM,
                    "tool_ids": tool_ids,
                    "built_in_tools": {
                        "language_detection": {
                            "name": "language_detection",
                            "params": {"system_tool_type": "language_detection"},
                        },
                        "end_call": {"name": "end_call", "params": {"system_tool_type": "end_call"}},
                    },
                },
            },
            "language_presets": {code: {"overrides": {"agent": {"language": code}}} for code in LANGS},
            # Keypad digits arrive as one user turn; # ends it at once.
            "conversation": {
                "dtmf_input_settings": {"dtmf_input_timeout": 1.5, "hash_terminator": True, "redact_input": False},
            },
        },
        # Silta never stores a caller's voice.
        "platform_settings": {"privacy": {"record_voice": False, "retention_days": 7}},
    }


def find_agent() -> str | None:
    for a in el("GET", "/agents?page_size=100").get("agents", []):
        if a.get("name") == AGENT_NAME:
            return a["agent_id"]
    return None


def sync() -> str:
    tool_ids = [upsert_tool(COMPOSE_TOOL), upsert_tool(DOORS_TOOL)]
    body = agent_body(tool_ids)
    agent_id = find_agent()
    if agent_id:
        el("PATCH", f"/agents/{agent_id}", body)
        print(f"updated agent {agent_id}")
    else:
        agent_id = el("POST", "/agents/create", body)["agent_id"]
        print(f"created agent {agent_id}")
    print(f"tools: {tool_ids}")
    print(f"browser test: https://elevenlabs.io/app/talk-to?agent_id={agent_id}")
    return agent_id


def import_number(number: str) -> None:
    agent_id = find_agent() or sync()
    res = el("POST", "/phone-numbers", {
        "phone_number": number,
        "label": AGENT_NAME,
        "sid": ENV["TWILIO_SID"],
        "token": ENV["TWILIO_TOKEN"],
        "provider": "twilio",
        "agent_id": agent_id,
    })
    print(f"imported {number} as {res.get('phone_number_id')} -> agent {agent_id}")


def show() -> None:
    print("agent:", find_agent())
    print("tools:", [(t["tool_config"]["name"], t["id"]) for t in el("GET", "/tools").get("tools", [])])
    nums = el("GET", "/phone-numbers")
    print("numbers:", [(n.get("phone_number"), (n.get("assigned_agent") or {}).get("agent_id")) for n in nums] if isinstance(nums, list) else nums)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "show"
    if cmd == "sync":
        sync()
    elif cmd == "import-number" and len(sys.argv) == 3:
        import_number(sys.argv[2])
    elif cmd == "show":
        show()
    else:
        sys.exit(__doc__)
