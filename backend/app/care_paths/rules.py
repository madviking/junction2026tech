"""Load and validate the care-path decision tables from rules.yaml."""

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

RULES_FILE = Path(__file__).parent / "rules.yaml"
STAGES = ("describe", "route", "contact", "wait", "visit", "followup")
BASES = ("legal", "recommended", "open")


class RulesError(ValueError):
    """rules.yaml is missing data or points at codes that do not exist."""


@dataclass(frozen=True)
class Clock:
    label: str
    limit: str
    basis: str


@dataclass(frozen=True)
class Rule:
    lane: str
    route: str | None
    title: str
    script_fi: str
    clocks: tuple[Clock, ...]
    clocks_without_care_guarantee: tuple[Clock, ...] | None


@dataclass(frozen=True)
class Rules:
    lanes: dict[str, dict[str, Any]]
    routes: dict[str, dict[str, Any]]
    profiles: dict[str, dict[str, Any]]
    barriers: dict[str, dict[str, Any]]
    default_rules: dict[str, Rule] = field(default_factory=dict)
    route_rules: dict[tuple[str, str], Rule] = field(default_factory=dict)

    def rule_for(self, lane: str, route: str) -> Rule:
        return self.route_rules.get((lane, route)) or self.default_rules[lane]


def _clocks(raw: list[dict[str, Any]] | None, where: str) -> tuple[Clock, ...]:
    clocks = tuple(Clock(label=c["label"], limit=str(c["limit"]), basis=c["basis"]) for c in raw or [])
    for clock in clocks:
        if clock.basis not in BASES:
            raise RulesError(f"{where}: unknown clock basis {clock.basis}")
    return clocks


def load_rules(path: Path = RULES_FILE) -> Rules:
    raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    try:
        rules = Rules(
            lanes=raw["lanes"], routes=raw["routes"], profiles=raw["profiles"], barriers=raw["barriers"]
        )
    except KeyError as exc:
        raise RulesError(f"missing section {exc.args[0]}") from exc

    for code, barrier in rules.barriers.items():
        stage = (barrier.get("step") or {}).get("stage")
        if stage is not None and stage not in STAGES:
            raise RulesError(f"barrier {code}: unknown stage {stage}")

    for entry in raw.get("rules") or []:
        lane, route = entry.get("lane"), entry.get("route")
        where = f"rule {lane}/{route or '*'}"
        if lane not in rules.lanes:
            raise RulesError(f"{where}: unknown lane {lane}")
        if route is not None and route not in rules.routes:
            raise RulesError(f"{where}: unknown route {route}")
        alt = entry.get("clocks_without_care_guarantee")
        rule = Rule(
            lane=lane,
            route=route,
            title=entry["title"],
            script_fi=entry["script_fi"],
            clocks=_clocks(entry.get("clocks"), where),
            clocks_without_care_guarantee=_clocks(alt, where) if alt is not None else None,
        )
        if route is None:
            rules.default_rules[lane] = rule
        else:
            rules.route_rules[(lane, route)] = rule

    missing = sorted(set(rules.lanes) - set(rules.default_rules))
    if missing:
        raise RulesError(f"no default rule for lanes {','.join(missing)}")
    return rules


@lru_cache
def get_rules() -> Rules:
    return load_rules(RULES_FILE)
