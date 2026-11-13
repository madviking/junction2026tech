from dataclasses import dataclass, field
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

UsageStatus = Literal["ok", "provider_error", "invalid_output"]


@dataclass(frozen=True)
class IntegrationSpec:
    """One feature's model choice, loaded from integrations/<key>.yaml."""

    key: str
    description: str
    provider: str
    model: str
    fallback_provider: str | None = None
    fallback_model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    prompts: tuple[str, ...] = ()


@dataclass(frozen=True)
class UsageRecord:
    feature: str
    provider: str
    model: str
    status: UsageStatus
    latency_ms: int
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    total_tokens: int | None = None
    cost_usd: float | None = None
    error: str | None = None
    context: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LLMResult(Generic[T]):
    text: str
    parsed: T | None
    provider: str
    model: str
    usage: UsageRecord
