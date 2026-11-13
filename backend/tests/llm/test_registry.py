import pytest

from app.llm import LLMConfigError, registry


def test_example_seed_loads() -> None:
    spec = registry.resolve("example.summary")

    assert spec.provider == "openrouter"
    assert spec.model
    assert spec.prompts == ("example_summary_system",)


def test_env_override_replaces_only_the_model(monkeypatch: pytest.MonkeyPatch) -> None:
    seed = registry.resolve("example.summary")
    monkeypatch.setenv("LLM_MODEL__EXAMPLE_SUMMARY", "test/override-model")

    spec = registry.resolve("example.summary")

    assert spec.model == "test/override-model"
    assert spec.provider == seed.provider
    assert spec.fallback_model == seed.fallback_model


def test_unknown_feature_is_a_config_error() -> None:
    with pytest.raises(LLMConfigError, match="integration_seed_missing"):
        registry.resolve("nope.missing")


def test_every_seed_is_valid() -> None:
    for key in registry.list_keys():
        assert registry.load_spec(key).key == key
