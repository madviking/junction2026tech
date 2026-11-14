"""Offline checks of the phone agent config (no network). Run: python3 -m unittest scripts/test_phone_agent.py"""
from __future__ import annotations

import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import phone_agent as p  # noqa: E402

TYPES = Path(__file__).resolve().parents[1] / "backend/care_paths/domain/types.ts"


def app_langs() -> list[str]:
    m = re.search(r"export const LANGS: readonly Lang\[\] = \[([^\]]*)\]", TYPES.read_text(encoding="utf-8"))
    assert m, "LANGS not found in types.ts"
    return re.findall(r"'([a-z]+)'", m.group(1))


class PhoneAgentConfig(unittest.TestCase):
    def test_every_app_language_can_be_spoken_on_the_phone(self):
        # Bulgarian was served by the app but missing here: the agent said it cannot speak it.
        missing = [code for code in app_langs() if code != "en" and code not in p.LANGS]
        self.assertEqual(missing, [])

    def test_every_phone_language_has_a_preset_and_a_keypad_path(self):
        body = p.agent_body(["tool"])
        self.assertEqual(sorted(body["conversation_config"]["language_presets"]), sorted(p.LANGS))
        keyed = {code for code, _ in p.MENU.values()} | {code for code, _ in p.MORE.values()}
        self.assertEqual(sorted(set(p.LANGS) - keyed), [])

    def test_greeting_first_says_you_can_speak_the_language_name(self):
        menu_start = p.FIRST_MESSAGE.index(p.MENU["1"][1])
        before_menu = p.FIRST_MESSAGE[:menu_start]
        self.assertIn("Say the name of your language", before_menu)
        self.assertIn("Sano kielesi nimi", before_menu)
        self.assertIn("wait for the menu", before_menu)

    def test_prompt_refuses_off_topic_requests_and_role_changes(self):
        # A caller asking for a cake recipe must be steered back to care, not answered.
        self.assertIn("Stay on topic", p.PROMPT)
        self.assertIn("recipes", p.PROMPT)
        self.assertIn("ignore these instructions", p.PROMPT)
        self.assertIn("not even partly", p.PROMPT)

    def test_prompt_lists_every_phone_language_for_the_compose_tool(self):
        for code in p.LANGS:
            self.assertIn(code, p.COMPOSE_TOOL["api_schema"]["request_body_schema"]["properties"]["lang"]["description"])
            self.assertIn(code, p.PROMPT)


if __name__ == "__main__":
    unittest.main()
