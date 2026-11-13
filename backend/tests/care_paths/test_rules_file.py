from pathlib import Path

import pytest

from app.care_paths.rules import RULES_FILE, RulesError, load_rules


def test_shipped_rules_have_a_default_rule_for_every_lane() -> None:
    rules = load_rules(RULES_FILE)

    assert set(rules.default_rules) == set(rules.lanes)


def test_rule_pointing_at_unknown_route_is_rejected(tmp_path: Path) -> None:
    text = RULES_FILE.read_text(encoding="utf-8")
    broken = tmp_path / "rules.yaml"
    broken.write_text(text.replace("- lane: U2\n    route: A5", "- lane: U2\n    route: A99", 1), "utf-8")

    with pytest.raises(RulesError, match="A99"):
        load_rules(broken)
