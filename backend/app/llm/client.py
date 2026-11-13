"""Chat completions with model resolution, typed output, fallback and usage recording."""

import logging
import re
import time
from collections.abc import Callable, Sequence
from typing import Any, Protocol

import httpx
from pydantic import BaseModel, ValidationError

from app.config import Settings, get_settings
from app.core.db import connect
from app.llm import registry, repository
from app.llm.errors import LLMOutputError, LLMProviderError
from app.llm.providers import Provider, get_provider
from app.llm.schemas import IntegrationSpec, LLMResult, T, UsageRecord, UsageStatus

logger = logging.getLogger(__name__)

Message = dict[str, str]
Transport = Callable[[str, dict[str, str], dict[str, Any], float], dict[str, Any]]


def http_transport(
    url: str, headers: dict[str, str], payload: dict[str, Any], timeout: float
) -> dict[str, Any]:
    response = httpx.post(url, headers=headers, json=payload, timeout=timeout)
    response.raise_for_status()
    return response.json()


class UsageSink(Protocol):
    def record(self, record: UsageRecord) -> None: ...


class PostgresUsageSink:
    """Default sink: one llm_usage row per attempt. Failures propagate; never swallow them."""

    def record(self, record: UsageRecord) -> None:
        with connect() as conn:
            repository.insert_usage(conn, record)


_FENCE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.DOTALL)


def _strip_code_fence(text: str) -> str:
    match = _FENCE.match(text.strip())
    return match.group(1) if match else text


def _response_format(output_type: type[BaseModel]) -> dict[str, Any]:
    return {
        "type": "json_schema",
        "json_schema": {"name": output_type.__name__, "schema": output_type.model_json_schema()},
    }


class LLMClient:
    def __init__(
        self,
        transport: Transport = http_transport,
        usage_sink: UsageSink | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._transport = transport
        self._usage_sink = usage_sink or PostgresUsageSink()
        self._settings = settings or get_settings()

    def complete(
        self,
        feature: str,
        messages: Sequence[Message],
        output_type: type[T] | None = None,
        context: dict[str, Any] | None = None,
    ) -> LLMResult[T]:
        """Run the feature's model, then its fallback on provider errors."""
        spec = registry.resolve(feature)
        attempts = [(spec.provider, spec.model)]
        if spec.fallback_provider and spec.fallback_model:
            attempts.append((spec.fallback_provider, spec.fallback_model))

        last_error: LLMProviderError | None = None
        for provider_name, model in attempts:
            provider = get_provider(provider_name, self._settings)
            try:
                return self._attempt(spec, provider, model, messages, output_type, context or {})
            except LLMProviderError as exc:
                logger.warning(
                    "llm attempt failed feature=%s provider=%s model=%s: %s",
                    feature,
                    provider_name,
                    model,
                    exc,
                )
                last_error = exc
        assert last_error is not None
        raise last_error

    def _attempt(
        self,
        spec: IntegrationSpec,
        provider: Provider,
        model: str,
        messages: Sequence[Message],
        output_type: type[T] | None,
        context: dict[str, Any],
    ) -> LLMResult[T]:
        payload: dict[str, Any] = {"model": model, "messages": list(messages)}
        if spec.temperature is not None:
            payload["temperature"] = spec.temperature
        if spec.max_tokens is not None:
            payload["max_tokens"] = spec.max_tokens
        if output_type is not None:
            payload["response_format"] = _response_format(output_type)
        if provider.reports_cost:
            payload["usage"] = {"include": True}

        started = time.perf_counter()
        try:
            data = self._transport(
                f"{provider.base_url}/chat/completions",
                provider.headers(),
                payload,
                self._settings.llm_timeout_seconds,
            )
            text = data["choices"][0]["message"]["content"] or ""
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            self._record(spec, provider, model, started, "provider_error", {}, context, error=repr(exc))
            raise LLMProviderError(f"{provider.name}:{model}:{exc.__class__.__name__}") from exc

        parsed: T | None = None
        status: UsageStatus = "ok"
        validation_error: ValidationError | None = None
        if output_type is not None:
            try:
                parsed = output_type.model_validate_json(_strip_code_fence(text))
            except ValidationError as exc:
                status, validation_error = "invalid_output", exc

        usage = self._record(
            spec,
            provider,
            model,
            started,
            status,
            data.get("usage") or {},
            context,
            error=str(validation_error) if validation_error else None,
        )
        if validation_error is not None:
            raise LLMOutputError(f"{spec.key}:{model}:invalid_output") from validation_error
        return LLMResult(text=text, parsed=parsed, provider=provider.name, model=model, usage=usage)

    def _record(
        self,
        spec: IntegrationSpec,
        provider: Provider,
        model: str,
        started: float,
        status: UsageStatus,
        usage: dict[str, Any],
        context: dict[str, Any],
        error: str | None = None,
    ) -> UsageRecord:
        record = UsageRecord(
            feature=spec.key,
            provider=provider.name,
            model=model,
            status=status,
            latency_ms=int((time.perf_counter() - started) * 1000),
            prompt_tokens=usage.get("prompt_tokens"),
            completion_tokens=usage.get("completion_tokens"),
            total_tokens=usage.get("total_tokens"),
            cost_usd=usage.get("cost"),
            error=error[:2000] if error else None,
            context=context,
        )
        self._usage_sink.record(record)
        return record
