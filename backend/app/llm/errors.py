class LLMError(Exception):
    """Base class for LLM failures."""


class LLMConfigError(LLMError):
    """Missing integration seed, unknown provider or missing API key. Not retried."""


class LLMProviderError(LLMError):
    """The provider call failed (HTTP, timeout, malformed response). Falls back when configured."""


class LLMOutputError(LLMError):
    """The model answered but the answer does not match the requested output type."""
