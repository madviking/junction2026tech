"""Provider registry. Every provider speaks the OpenAI chat-completions protocol."""

from dataclasses import dataclass, field

from app.config import Settings
from app.llm.errors import LLMConfigError

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENAI_BASE_URL = "https://api.openai.com/v1"


@dataclass(frozen=True)
class Provider:
    name: str
    base_url: str
    api_key: str
    extra_headers: dict[str, str] = field(default_factory=dict)
    # OpenRouter returns the billed cost when asked for usage accounting.
    reports_cost: bool = False

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", **self.extra_headers}


def get_provider(name: str, settings: Settings) -> Provider:
    if name == "openrouter":
        provider = Provider(
            name=name,
            base_url=OPENROUTER_BASE_URL,
            api_key=settings.open_router_api_key,
            extra_headers={"X-Title": "Junction 2026"},
            reports_cost=True,
        )
    elif name == "openai":
        provider = Provider(name=name, base_url=OPENAI_BASE_URL, api_key=settings.openai_api_key)
    elif name == "mistral":
        provider = Provider(
            name=name, base_url=settings.mistral_base_url.rstrip("/"), api_key=settings.mistral_api_key
        )
    else:
        raise LLMConfigError(f"unknown_provider:{name}")
    if not provider.api_key:
        raise LLMConfigError(f"{name}_api_key_missing")
    return provider
