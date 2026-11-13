import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def compose(lane: str, route: str, profile: str, barriers: list[str] | None = None) -> dict:
    response = client.post(
        "/api/care-paths/compose",
        json={"lane": lane, "route": route, "profile": profile, "barriers": barriers or []},
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_options_list_every_dimension() -> None:
    response = client.get("/api/care-paths/options")

    assert response.status_code == 200
    body = response.json()
    assert [o["code"] for o in body["lanes"]] == ["U0", "U1", "U2", "U3", "U4", "U5"]
    assert [o["code"] for o in body["routes"]] == [f"A{i}" for i in range(1, 9)]
    assert [o["code"] for o in body["profiles"]] == [f"C{i}" for i in range(1, 8)]
    assert [o["code"] for o in body["barriers"]] == [f"B{i}" for i in range(1, 11)]


def test_emergency_goes_to_112_and_stops() -> None:
    path = compose("U0", "A7", "C3", ["B8"])

    assert path["destination"]["title"] == "Call 112 now"
    assert path["emergency"] is True
    assert path["steps"][-1]["text"].startswith("Silta shows 112")


@pytest.mark.parametrize("lane", ["U1", "U2", "U3", "U4", "U5"])
def test_language_and_barriers_never_change_destination_or_clocks(lane: str) -> None:
    baseline = compose(lane, "A1", "C1")
    adapted = compose(lane, "A1", "C3", ["B1", "B4", "B6", "B7", "B8", "B10"])

    assert adapted["destination"] == baseline["destination"]
    assert adapted["clocks"] == baseline["clocks"]


def test_route_specific_rule_overrides_lane_default() -> None:
    resident = compose("U2", "A1", "C1")
    reception = compose("U2", "A5", "C2")

    assert "county health station" in resident["destination"]["title"]
    assert "reception-centre nurse" in reception["destination"]["title"]


def test_barriers_add_their_adaptations_and_steps() -> None:
    path = compose("U2", "A1", "C2", ["B7"])

    assert [a["code"] for a in path["adaptations"]] == ["C2", "B7"]
    assert any(step["adaptation"] == "B7" for step in path["steps"])


def test_undocumented_route_is_anonymous_even_without_status_barrier() -> None:
    path = compose("U2", "A7", "C1")

    assert any(step["adaptation"] == "A7" and "No name or ID" in step["text"] for step in path["steps"])


def test_clock_bases_are_labelled() -> None:
    clocks = compose("U5", "A1", "C1")["clocks"]

    assert {c["basis"] for c in clocks} == {"legal", "recommended"}
    assert any(c["limit"] == "3 weeks" and c["basis"] == "legal" for c in clocks)


def test_review_flags_mark_unverified_rules() -> None:
    flags = compose("U3", "A6", "C2")["review_flags"]

    assert any(f["kind"] == "clinical" for f in flags)
    assert any(f["kind"] == "legal" for f in flags)
    assert compose("U5", "A1", "C1")["review_flags"] == []


def test_unknown_code_is_rejected() -> None:
    response = client.post(
        "/api/care-paths/compose", json={"lane": "U9", "route": "A1", "profile": "C1", "barriers": []}
    )

    assert response.status_code == 422
