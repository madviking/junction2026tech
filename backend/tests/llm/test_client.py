"""LLMClient behavior with a fake transport. No network, no paid calls."""

import json
from typing import Any

import httpx
import pytest
from pydantic import BaseModel

from app.config import Settings
from app.llm import LLMClient, LLMConfigError, LLMOutputError, LLMProviderError
from app.llm.schemas import UsageRecord


class Summary(BaseModel):
    headline: str
    points: list[str]


class ListSink:
    def __init__(self) -> None:
        self.records: list[UsageRecord] = []

    def record(self, record: UsageRecord) -> None:
        self.records.append(record)


class FakeTransport:
    def __init__(self, *responses: Any) -> None:
        self.responses = list(responses)
        self.calls: list[dict[str, Any]] = []

    def __call__(self, url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float):
        self.calls.append({"url": url, "headers": headers, "payload": payload, "timeout": timeout})
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def _completion(content: str, cost: float | None = 0.0001) -> dict[str, Any]:
    usage = {"prompt_tokens": 40, "completion_tokens": 12, "total_tokens": 52}
    if cost is not None:
        usage["cost"] = cost
    return {"choices": [{"message": {"content": content}}], "usage": usage}


def _settings() -> Settings:
    return Settings(open_router_api_key="test-key", llm_timeout_seconds=5)


MESSAGES = [{"role": "user", "content": "hello"}]


def test_typed_completion_is_parsed_and_recorded() -> None:
    transport = FakeTransport(_completion(json.dumps({"headline": "Hi", "points": ["a"]})))
    sink = ListSink()

    result = LLMClient(transport, sink, _settings()).complete(
        "example.summary", MESSAGES, output_type=Summary, context={"case": 1}
    )

    assert result.parsed == Summary(headline="Hi", points=["a"])
    call = transport.calls[0]
    assert call["url"].endswith("/chat/completions")
    assert call["payload"]["response_format"]["json_schema"]["name"] == "Summary"
    assert call["payload"]["usage"] == {"include": True}
    assert call["timeout"] == 5
    [record] = sink.records
    assert (record.feature, record.status, record.total_tokens, record.cost_usd) == (
        "example.summary",
        "ok",
        52,
        0.0001,
    )
    assert record.context == {"case": 1}


def test_fenced_json_is_accepted() -> None:
    transport = FakeTransport(_completion('```json\n{"headline": "Hi", "points": []}\n```'))

    result = LLMClient(transport, ListSink(), _settings()).complete("example.summary", MESSAGES, Summary)

    assert result.parsed is not None and result.parsed.headline == "Hi"


def test_provider_error_falls_back_and_records_both_attempts() -> None:
    error = httpx.ConnectError("boom")
    transport = FakeTransport(error, _completion("plain text"))
    sink = ListSink()

    result = LLMClient(transport, sink, _settings()).complete("example.summary", MESSAGES)

    assert result.text == "plain text"
    assert [r.status for r in sink.records] == ["provider_error", "ok"]
    assert sink.records[0].model != sink.records[1].model


def test_all_attempts_failing_raises_provider_error() -> None:
    transport = FakeTransport(httpx.ConnectError("a"), httpx.ConnectError("b"))

    with pytest.raises(LLMProviderError):
        LLMClient(transport, ListSink(), _settings()).complete("example.summary", MESSAGES)


def test_invalid_output_is_recorded_then_raised() -> None:
    transport = FakeTransport(_completion("not json"))
    sink = ListSink()

    with pytest.raises(LLMOutputError):
        LLMClient(transport, sink, _settings()).complete("example.summary", MESSAGES, Summary)

    assert [r.status for r in sink.records] == ["invalid_output"]


def test_missing_api_key_fails_before_any_request() -> None:
    transport = FakeTransport()

    with pytest.raises(LLMConfigError, match="openrouter_api_key_missing"):
        LLMClient(transport, ListSink(), Settings(open_router_api_key="")).complete(
            "example.summary", MESSAGES
        )

    assert transport.calls == []
