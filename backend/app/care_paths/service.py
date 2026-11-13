"""Compose a Silta care path from urgency, access route, communication profile and barriers.

Equality rule: lane + route decide destination and clocks; profile and barriers only add
adaptations and steps.
"""

from app.care_paths.rules import Rules, get_rules
from app.care_paths.schemas import (
    Adaptation,
    CarePath,
    CarePathOptions,
    Clock,
    ComposeRequest,
    Destination,
    Option,
    ReviewFlag,
    Step,
)


def list_options(rules: Rules | None = None) -> CarePathOptions:
    rules = rules or get_rules()
    return CarePathOptions(
        lanes=[
            Option(code=k, name=v["name"], summary=v["trigger"], detail=v["tone"])
            for k, v in rules.lanes.items()
        ],
        routes=[
            Option(code=k, name=v["name"], summary=v["who"], detail=v["note"])
            for k, v in rules.routes.items()
        ],
        profiles=[
            Option(code=k, name=v["name"], summary=v["who"], detail=v["mode"])
            for k, v in rules.profiles.items()
        ],
        barriers=[
            Option(code=k, name=v["name"], summary=v["looks"], detail=v["fix"])
            for k, v in rules.barriers.items()
        ],
    )


def compose(request: ComposeRequest, rules: Rules | None = None) -> CarePath:
    rules = rules or get_rules()
    lane, route, profile = request.lane, request.route, request.profile
    route_info, profile_info = rules.routes[route], rules.profiles[profile]
    rule = rules.rule_for(lane, route)

    clocks = rule.clocks
    if not route_info.get("care_guarantee") and rule.clocks_without_care_guarantee is not None:
        clocks = rule.clocks_without_care_guarantee
    destination = Destination(
        title=rule.title.format(door=route_info["door"]), script_fi=rule.script_fi, note=route_info["note"]
    )

    adaptations = [
        Adaptation(
            code=profile, name=profile_info["name"], how=profile_info["mode"], right=profile_info["right"]
        )
    ]
    adaptations += [
        Adaptation(code=b, name=rules.barriers[b]["name"], how=rules.barriers[b]["fix"])
        for b in request.barriers
    ]

    return CarePath(
        lane=lane,
        route=route,
        profile=profile,
        barriers=request.barriers,
        emergency=lane == "U0",
        destination=destination,
        clocks=[Clock(label=c.label, limit=c.limit, basis=c.basis) for c in clocks],
        adaptations=adaptations,
        steps=_steps(rules, request, destination),
        review_flags=_review_flags(rules, lane, route),
    )


def _steps(rules: Rules, request: ComposeRequest, destination: Destination) -> list[Step]:
    lane, route, profile = request.lane, request.route, request.profile
    profile_info, route_info = rules.profiles[profile], rules.routes[route]
    steps: list[Step] = []

    def barrier_steps(stage: str) -> None:
        for code in request.barriers:
            step = rules.barriers[code].get("step") or {}
            if step.get("stage") == stage:
                steps.append(Step(text=step["text"], detail=step.get("detail"), adaptation=code))

    steps.append(Step(text="Describe the symptom", detail=profile_info["mode"], adaptation=profile))
    barrier_steps("describe")
    if lane == "U0":
        steps.append(
            Step(text="Silta shows 112 and the Finnish phrase card", detail="Silta stops here; no forms")
        )
        return steps

    steps.append(Step(text=f"Silta routes: {rules.lanes[lane]['name']}", detail=rules.lanes[lane]["tone"]))
    extra = route_info.get("extra_step")
    if extra:
        steps.append(Step(text=extra["text"], detail=extra.get("detail"), adaptation=route))
    barrier_steps("route")

    steps.append(
        Step(text=f"Contact: {destination.title}", detail=profile_info["contact"], adaptation=profile)
    )
    barrier_steps("contact")

    if lane == "U5":
        steps.append(
            Step(text="Clock check: a referral should be handled within 3 weeks, faster for suspected cancer")
        )
        steps.append(Step(text="Escalate if needed: muistutus, then patient ombudsman, then kantelu"))
        return steps

    if lane == "U4":
        steps.append(Step(text="Book the follow-up exam; reminder after 1 week"))
    else:
        steps.append(
            Step(
                text="Wait with the clock visible; contact again if anything changes",
                detail="Re-assessment is a right",
            )
        )
    barrier_steps("wait")

    steps.append(
        Step(
            text="Visit card with QR summary and five questions",
            detail=profile_info["visit_card"],
            adaptation=profile,
        )
    )
    barrier_steps("visit")

    steps.append(Step(text="Referral and results tracked; prompts at day 3, week 1 and week 3"))
    barrier_steps("followup")
    steps.append(Step(text="Same anonymous stage timestamps recorded for county analytics"))
    return steps


def _review_flags(rules: Rules, lane: str, route: str) -> list[ReviewFlag]:
    flags: list[ReviewFlag] = []
    if rules.lanes[lane].get("needs_clinical_review"):
        flags.append(
            ReviewFlag(kind="clinical", message=f"Symptom triggers for lane {lane} need clinical review")
        )
    if rules.routes[route].get("needs_legal_review"):
        flags.append(
            ReviewFlag(
                kind="legal", message=f"Access rules for route {route} need legal or county confirmation"
            )
        )
    return flags
