from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.care_paths.rules import get_rules


class Option(BaseModel):
    code: str
    name: str
    summary: str
    detail: str | None = None


class CarePathOptions(BaseModel):
    lanes: list[Option]
    routes: list[Option]
    profiles: list[Option]
    barriers: list[Option]


class ComposeRequest(BaseModel):
    lane: str = Field(description="Urgency lane code, e.g. U2")
    route: str = Field(description="Access route code, e.g. A1")
    profile: str = Field(description="Communication profile code, e.g. C2")
    barriers: list[str] = Field(default_factory=list, description="Barrier codes, e.g. B6")

    @field_validator("lane")
    @classmethod
    def _known_lane(cls, value: str) -> str:
        return _known(value, get_rules().lanes, "lane")

    @field_validator("route")
    @classmethod
    def _known_route(cls, value: str) -> str:
        return _known(value, get_rules().routes, "route")

    @field_validator("profile")
    @classmethod
    def _known_profile(cls, value: str) -> str:
        return _known(value, get_rules().profiles, "profile")

    @field_validator("barriers")
    @classmethod
    def _known_barriers(cls, value: list[str]) -> list[str]:
        known = get_rules().barriers
        for code in value:
            _known(code, known, "barrier")
        return list(dict.fromkeys(value))


def _known(code: str, table: dict, kind: str) -> str:
    if code not in table:
        raise ValueError(f"unknown {kind} code {code}")
    return code


class Clock(BaseModel):
    label: str
    limit: str
    basis: Literal["legal", "recommended", "open"]


class Destination(BaseModel):
    title: str
    script_fi: str
    note: str


class Adaptation(BaseModel):
    code: str
    name: str
    how: str
    right: str | None = None


class Step(BaseModel):
    text: str
    detail: str | None = None
    adaptation: str | None = Field(default=None, description="Code that added this step, if any")


class ReviewFlag(BaseModel):
    kind: Literal["clinical", "legal"]
    message: str


class CarePath(BaseModel):
    lane: str
    route: str
    profile: str
    barriers: list[str]
    emergency: bool
    destination: Destination
    clocks: list[Clock]
    adaptations: list[Adaptation]
    steps: list[Step]
    review_flags: list[ReviewFlag]
